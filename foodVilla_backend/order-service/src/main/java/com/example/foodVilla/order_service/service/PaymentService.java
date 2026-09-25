package com.example.foodVilla.order_service.service;

import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.PaymentConfigResponse;
import com.example.foodVilla.order_service.dto.PaymentFailureRequest;
import com.example.foodVilla.order_service.dto.PaymentSessionResponse;
import com.example.foodVilla.order_service.dto.VerifyPaymentRequest;
import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.OrderStatusHistory;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import com.example.foodVilla.order_service.exception.PaymentException;
import com.example.foodVilla.order_service.exception.ResourceNotFoundException;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import com.example.foodVilla.order_service.payment.RazorpayGateway;
import com.example.foodVilla.order_service.payment.RazorpayGateway.RazorpayOrder;
import com.example.foodVilla.order_service.payment.RazorpayGateway.RazorpayPayment;
import com.example.foodVilla.order_service.repository.OrderRepository;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Razorpay TEST MODE payments for an order.
 *
 * <h3>How an order and its payment relate</h3>
 * Payment state (PENDING / CONFIRMED / FAILED) and order state are separate.
 * An order is created {@code CREATED} + payment {@code PENDING}. It is only
 * handed to the restaurant — {@code CREATED -> RESTAURANT_PENDING} — at the
 * moment a payment is verified server-side. Nothing the browser says can do
 * that: the only inputs that mark an order paid are a Razorpay signature this
 * service verifies with the API secret, or Razorpay itself confirming the
 * payment when asked directly ({@link #syncPayment}).
 *
 * <h3>Rules</h3>
 * <ul>
 *   <li>The amount charged is always the total stored on the order; a client
 *       amount is only compared against it.</li>
 *   <li>Only the order's owner or an ADMIN may touch its payment.</li>
 *   <li>A verify request must quote the Razorpay order created for THIS order.</li>
 *   <li>State changes run under a row lock, so a double submit or a retry
 *       applies the payment once; repeating a successful verify is a no-op.</li>
 *   <li>No Razorpay network call is made while a row lock is held.</li>
 * </ul>
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    static final String CURRENCY = "INR";
    static final String PROVIDER = "RAZORPAY_TEST";
    private static final long MIN_AMOUNT_PAISE = 100; // Razorpay's minimum is Rs 1

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final RazorpayGateway gateway;
    private final PaymentPolicy policy;
    private final OrderStatusTransitionValidator transitionValidator;
    private final OrderEventPublisher eventPublisher;
    private final TransactionTemplate tx;

    public PaymentService(OrderRepository orderRepository,
                          OrderService orderService,
                          RazorpayGateway gateway,
                          PaymentPolicy policy,
                          OrderStatusTransitionValidator transitionValidator,
                          OrderEventPublisher eventPublisher,
                          PlatformTransactionManager transactionManager) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.gateway = gateway;
        this.policy = policy;
        this.transitionValidator = transitionValidator;
        this.eventPublisher = eventPublisher;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public PaymentConfigResponse getConfig() {
        if (gateway.isAvailable()) {
            return new PaymentConfigResponse(true, "TEST", "Razorpay test mode - no real money is charged.");
        }
        return new PaymentConfigResponse(false, "TEST", gateway.unavailableReason());
    }

    /**
     * Starts (or resumes) a payment for an order and returns what Razorpay
     * Checkout needs. Repeating the call returns the same Razorpay order, so a
     * double click or a page refresh never creates a second one.
     *
     * @param clientAmount what the customer saw (rupees) — never charged, only compared
     */
    public PaymentSessionResponse createPayment(Long orderId, AuthenticatedUser principal, BigDecimal clientAmount) {
        requireAvailable();

        Order order = loadForCaller(orderId, principal);
        assertPayable(order);
        assertAmountMatches(order, clientAmount);

        long amountPaise = toPaise(order.getFinalAmount());
        if (amountPaise < MIN_AMOUNT_PAISE) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE",
                    "This order total is below the minimum online payment amount.");
        }

        String newRazorpayOrderId = null;
        if (order.getRazorpayOrderId() != null) {
            // The customer may already have paid this Razorpay order in an earlier
            // session (page refreshed or closed before the browser could call
            // /verify). Ask Razorpay before reopening Checkout on a paid order.
            if (reconcile(order)) {
                throw new PaymentException(HttpStatus.CONFLICT, "ORDER_ALREADY_PAID", "This order has already been paid.");
            }
        } else {
            RazorpayOrder created = gateway.createOrder(amountPaise, CURRENCY, "foodvilla-order-" + orderId,
                    Map.of("orderId", String.valueOf(orderId), "userId", String.valueOf(order.getUserId())));
            newRazorpayOrderId = created.id();
        }

        String razorpayOrderId = attachAndReopen(orderId, newRazorpayOrderId);
        return new PaymentSessionResponse(orderId, razorpayOrderId, amountPaise, CURRENCY, gateway.keyId());
    }

    /**
     * Verifies the signature Razorpay Checkout returned and, if valid, marks the
     * order paid and hands it to the restaurant. Repeating a successful verify
     * returns the current order unchanged.
     */
    public OrderResponse verifyPayment(Long orderId, AuthenticatedUser principal, VerifyPaymentRequest request) {
        requireAvailable();

        Outcome outcome = tx.execute(status -> {
            Order order = lockForCaller(orderId, principal);

            String expectedRazorpayOrderId = order.getRazorpayOrderId();
            if (expectedRazorpayOrderId == null) {
                throw new PaymentException(HttpStatus.CONFLICT, "PAYMENT_NOT_STARTED",
                        "No payment has been started for this order.");
            }
            if (!expectedRazorpayOrderId.equals(request.razorpayOrderId())) {
                log.warn("Rejected payment verification for order {}: the Razorpay order does not belong to it", orderId);
                throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_ORDER_MISMATCH",
                        "This payment does not belong to this order.");
            }
            if (!gateway.verifySignature(expectedRazorpayOrderId, request.razorpayPaymentId(), request.razorpaySignature())) {
                log.warn("Rejected payment verification for order {}: invalid signature", orderId);
                throw new PaymentException(HttpStatus.BAD_REQUEST, "INVALID_SIGNATURE",
                        "Payment verification failed. Your order has not been marked as paid.");
            }

            boolean changed = applyConfirmedPayment(order, request.razorpayPaymentId());
            Order saved = changed ? orderRepository.save(order) : order;
            return new Outcome(saved, orderService.toResponse(saved), changed);
        });

        if (outcome.changed()) {
            publishPaid(outcome.order());
        }
        return outcome.response();
    }

    /**
     * The browser saw Razorpay Checkout report a failed attempt. This can only
     * record a failure on an order that is still unpaid: it never marks anything
     * paid, never undoes a paid order, and does not cancel the order — the
     * customer can retry, and a valid signature later still wins.
     */
    public OrderResponse reportFailure(Long orderId, AuthenticatedUser principal, PaymentFailureRequest request) {
        return tx.execute(status -> {
            Order order = lockForCaller(orderId, principal);

            if (order.getRazorpayOrderId() == null || !order.getRazorpayOrderId().equals(request.razorpayOrderId())) {
                throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_ORDER_MISMATCH",
                        "This payment does not belong to this order.");
            }
            if (order.getOrderStatus() == OrderStatus.CREATED && order.getPaymentStatus() != PaymentStatus.CONFIRMED) {
                order.setPaymentStatus(PaymentStatus.FAILED);
                order.setPaymentFailureReason(failureReason(request));
                orderRepository.save(order);
            }
            return orderService.toResponse(order);
        });
    }

    /**
     * Asks Razorpay directly whether this order's payment went through, and if
     * so applies it. Recovers the case where the customer paid but the browser
     * never reached /verify (refresh, closed tab, dropped connection). Safe to
     * call any time; it changes nothing unless Razorpay reports a successful
     * payment for this order's Razorpay order at the right amount.
     */
    public OrderResponse syncPayment(Long orderId, AuthenticatedUser principal) {
        requireAvailable();

        Order order = loadForCaller(orderId, principal);
        if (order.getPaymentStatus() != PaymentStatus.CONFIRMED
                && order.getOrderStatus() != OrderStatus.CANCELLED
                && order.getRazorpayOrderId() != null) {
            reconcile(order);
        }
        return tx.execute(status -> orderService.toResponse(
                orderRepository.findById(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId))));
    }

    // ----------------------------------------------------------------------

    /**
     * Looks for a successful Razorpay payment on the order's Razorpay order and
     * applies it. Returns true if the order is paid afterwards.
     */
    private boolean reconcile(Order order) {
        long expectedPaise = toPaise(order.getFinalAmount());
        String razorpayOrderId = order.getRazorpayOrderId();

        Optional<RazorpayPayment> paid = gateway.fetchPayments(razorpayOrderId).stream()
                .filter(RazorpayPayment::isSuccessful)
                .filter(payment -> razorpayOrderId.equals(payment.orderId()))
                .filter(payment -> payment.amountPaise() == expectedPaise)
                .findFirst();
        if (paid.isEmpty()) {
            return false;
        }

        Outcome outcome = tx.execute(status -> {
            Order locked = orderRepository.findByIdForUpdate(order.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + order.getId()));
            if (!razorpayOrderId.equals(locked.getRazorpayOrderId())) {
                return new Outcome(locked, null, false);
            }
            boolean changed = applyConfirmedPayment(locked, paid.get().id());
            Order saved = changed ? orderRepository.save(locked) : locked;
            return new Outcome(saved, null, changed);
        });

        if (outcome.changed()) {
            publishPaid(outcome.order());
        }
        return outcome.order().getPaymentStatus() == PaymentStatus.CONFIRMED;
    }

    /**
     * Records a payment Razorpay has confirmed. Must run inside a transaction on
     * a row-locked order. Returns true when this call changed the order, false
     * when the same payment had already been applied (idempotent repeat).
     */
    private boolean applyConfirmedPayment(Order order, String paymentId) {
        if (order.getPaymentStatus() == PaymentStatus.CONFIRMED) {
            if (paymentId.equals(order.getPaymentId())) {
                return false;
            }
            log.warn("Order {} is already paid with {}; refusing to overwrite it with payment {}",
                    order.getId(), order.getPaymentId(), paymentId);
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_ALREADY_PAID",
                    "This order has already been paid.");
        }
        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            log.warn("Payment {} arrived for cancelled order {}; not applying it", paymentId, order.getId());
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE",
                    "This order was cancelled, so the payment could not be applied. Payment reference: " + paymentId);
        }

        order.setPaymentId(paymentId);
        order.setPaymentStatus(PaymentStatus.CONFIRMED);
        order.setPaymentProvider(PROVIDER);
        order.setPaidAt(policy.now());
        order.setPaymentFailureReason(null);

        // Payment is what makes the order valid for the restaurant.
        if (order.getOrderStatus() == OrderStatus.CREATED) {
            transitionValidator.validateTransition(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
            order.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
            order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.RESTAURANT_PENDING,
                    "Payment received (Razorpay test mode) - order sent to restaurant"));
        }
        return true;
    }

    /**
     * Under a row lock: re-checks the order can still be paid, stores the new
     * Razorpay order id if there is none yet (if another request got there first,
     * theirs is kept), and turns a FAILED attempt back into PENDING for the retry.
     */
    private String attachAndReopen(Long orderId, String newRazorpayOrderId) {
        return tx.execute(status -> {
            Order order = orderRepository.findByIdForUpdate(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
            assertPayable(order);

            boolean changed = false;
            if (order.getRazorpayOrderId() == null) {
                order.setRazorpayOrderId(newRazorpayOrderId);
                changed = true;
            }
            if (order.getPaymentStatus() == PaymentStatus.FAILED) {
                order.setPaymentStatus(PaymentStatus.PENDING);
                order.setPaymentFailureReason(null);
                changed = true;
            }
            if (changed) {
                orderRepository.save(order);
            }
            return order.getRazorpayOrderId();
        });
    }

    private void assertPayable(Order order) {
        if (order.getPaymentStatus() == PaymentStatus.CONFIRMED) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_ALREADY_PAID", "This order has already been paid.");
        }
        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE",
                    "This order was cancelled and can no longer be paid.");
        }
        if (order.getOrderStatus() != OrderStatus.CREATED) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE",
                    "This order does not need an online payment.");
        }
        if (policy.isExpired(order)) {
            throw new PaymentException(HttpStatus.GONE, "ORDER_EXPIRED",
                    "This order was not paid in time. Please place a new order.");
        }
    }

    private void assertAmountMatches(Order order, BigDecimal clientAmount) {
        if (clientAmount != null && clientAmount.compareTo(order.getFinalAmount()) != 0) {
            throw new PaymentException(HttpStatus.CONFLICT, "AMOUNT_MISMATCH",
                    "The amount does not match this order's total of Rs "
                            + order.getFinalAmount().toPlainString() + ". Please refresh and try again.");
        }
    }

    private void requireAvailable() {
        if (!gateway.isAvailable()) {
            throw new PaymentException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED",
                    gateway.unavailableReason());
        }
    }

    private Order loadForCaller(Long orderId, AuthenticatedUser principal) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        orderService.ensureOwnerOrAdmin(order, principal);
        return order;
    }

    private Order lockForCaller(Long orderId, AuthenticatedUser principal) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        orderService.ensureOwnerOrAdmin(order, principal);
        return order;
    }

    // Publishing happens after the payment is committed, and a broker problem
    // must not turn an already-recorded payment into an error for the customer.
    private void publishPaid(Order order) {
        try {
            eventPublisher.publishStatusChanged(order, OrderStatus.CREATED,
                    "Payment received - order sent to restaurant");
        } catch (RuntimeException ex) {
            log.error("Order {} was paid and saved, but publishing its status event failed: {}",
                    order.getId(), ex.getMessage());
        }
    }

    // Razorpay expects the smallest currency unit. Order amounts have two
    // decimals, so this is exact.
    private static long toPaise(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
    }

    // The description is client-supplied: keep it short and free of control characters.
    private static String failureReason(PaymentFailureRequest request) {
        StringBuilder reason = new StringBuilder();
        if (request.code() != null && !request.code().isBlank()) {
            reason.append(request.code().trim());
        }
        if (request.description() != null && !request.description().isBlank()) {
            if (reason.length() > 0) {
                reason.append(": ");
            }
            reason.append(request.description().trim());
        }
        String cleaned = reason.toString().replaceAll("\\p{Cntrl}", " ");
        if (cleaned.isBlank()) {
            return "Payment failed";
        }
        return cleaned.length() > 255 ? cleaned.substring(0, 255) : cleaned;
    }

    private record Outcome(Order order, OrderResponse response, boolean changed) {
    }
}
