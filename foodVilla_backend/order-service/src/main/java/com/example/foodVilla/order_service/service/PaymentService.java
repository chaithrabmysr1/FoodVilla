package com.example.foodVilla.order_service.service;

import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.PayOrderRequest;
import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.OrderStatusHistory;
import com.example.foodVilla.order_service.entity.PaymentMethod;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import com.example.foodVilla.order_service.exception.PaymentException;
import com.example.foodVilla.order_service.exception.ResourceNotFoundException;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import com.example.foodVilla.order_service.repository.OrderRepository;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.security.SecureRandom;

/**
 * Simulated payments for an order. There is no payment gateway behind this and
 * no real money moves: the customer fills in dummy details for a method, the
 * order is marked paid and handed to the restaurant, and a receipt id is issued.
 *
 * <h3>How an order and its payment relate</h3>
 * Payment state (PENDING / CONFIRMED / FAILED) and order state are separate.
 * An order is created {@code CREATED} + payment {@code PENDING}. It is handed
 * to the restaurant — {@code CREATED -> RESTAURANT_PENDING} — only in the same
 * transaction that records the payment, so an unpaid order never reaches a
 * restaurant queue.
 *
 * <h3>Rules</h3>
 * <ul>
 *   <li>The amount is always the total stored on the order; a client amount is
 *       only compared against it.</li>
 *   <li>Only the order's owner or an ADMIN may pay for it.</li>
 *   <li>State changes run under a row lock, so a double submit pays once; the
 *       second request is refused with {@code ORDER_ALREADY_PAID}.</li>
 *   <li>Card numbers, CVVs and expiry dates are not part of the request and are
 *       never stored. Only the method and a masked label are recorded.</li>
 * </ul>
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    /** Recorded as the order's payment provider: marks the payment as simulated. */
    static final String PROVIDER = "DEMO";

    private static final String ID_PREFIX = "FVPAY";
    private static final String ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ID_LENGTH = 12;
    private static final int MAX_DETAIL_LENGTH = 64;

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final PaymentPolicy policy;
    private final OrderStatusTransitionValidator transitionValidator;
    private final OrderEventPublisher eventPublisher;
    private final TransactionTemplate tx;
    private final SecureRandom random = new SecureRandom();

    public PaymentService(OrderRepository orderRepository,
                          OrderService orderService,
                          PaymentPolicy policy,
                          OrderStatusTransitionValidator transitionValidator,
                          OrderEventPublisher eventPublisher,
                          PlatformTransactionManager transactionManager) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.policy = policy;
        this.transitionValidator = transitionValidator;
        this.eventPublisher = eventPublisher;
        this.tx = new TransactionTemplate(transactionManager);
    }

    /**
     * Pays the order with the chosen method: records the payment, confirms the
     * order and hands it to the restaurant, then returns the updated order.
     */
    public OrderResponse payOrder(Long orderId, AuthenticatedUser principal, PayOrderRequest request) {
        PaymentMethod method = PaymentMethod.parse(request.method())
                .orElseThrow(() -> new PaymentException(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_METHOD",
                        "Choose UPI, Card, Net Banking, Paytm or PayPal."));
        String detail = cleanDetail(request.detail());

        Outcome outcome = tx.execute(status -> {
            Order order = orderRepository.findByIdForUpdate(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
            orderService.ensureOwnerOrAdmin(order, principal);
            assertPayable(order);
            assertAmountMatches(order, request.amount());

            applyPayment(order, method, detail);
            Order saved = orderRepository.save(order);
            return new Outcome(saved, orderService.toResponse(saved));
        });

        publishPaid(outcome.order());
        return outcome.response();
    }

    /**
     * Records the payment. Must run inside a transaction on a row-locked order
     * that has already passed {@link #assertPayable}.
     */
    private void applyPayment(Order order, PaymentMethod method, String detail) {
        order.setPaymentId(newPaymentId());
        order.setPaymentStatus(PaymentStatus.CONFIRMED);
        order.setPaymentProvider(PROVIDER);
        order.setPaymentMethod(method.name());
        order.setPaymentDetail(detail);
        order.setPaidAt(policy.now());
        order.setPaymentFailureReason(null);

        // Payment is what makes the order valid for the restaurant.
        transitionValidator.validateTransition(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        order.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.RESTAURANT_PENDING,
                "Payment received (" + method.label() + ") - order sent to restaurant"));
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

    // The receipt id, e.g. FVPAY7K2M9Q4XT1B. Unambiguous letters and digits only,
    // so it can be read out or typed without mixing up 0/O and 1/I.
    private String newPaymentId() {
        StringBuilder id = new StringBuilder(ID_PREFIX);
        for (int i = 0; i < ID_LENGTH; i++) {
            id.append(ID_ALPHABET.charAt(random.nextInt(ID_ALPHABET.length())));
        }
        return id.toString();
    }

    // Client-supplied and display-only: keep it short and free of control characters.
    private static String cleanDetail(String detail) {
        if (detail == null) {
            return null;
        }
        String cleaned = detail.replaceAll("\\p{Cntrl}", " ").trim();
        if (cleaned.isEmpty()) {
            return null;
        }
        return cleaned.length() > MAX_DETAIL_LENGTH ? cleaned.substring(0, MAX_DETAIL_LENGTH) : cleaned;
    }

    private record Outcome(Order order, OrderResponse response) {
    }
}
