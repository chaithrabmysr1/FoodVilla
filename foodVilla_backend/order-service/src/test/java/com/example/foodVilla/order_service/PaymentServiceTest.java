package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.PaymentConfigResponse;
import com.example.foodVilla.order_service.dto.PaymentFailureRequest;
import com.example.foodVilla.order_service.dto.PaymentSessionResponse;
import com.example.foodVilla.order_service.dto.VerifyPaymentRequest;
import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.OrderStatusHistory;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import com.example.foodVilla.order_service.exception.OrderAccessDeniedException;
import com.example.foodVilla.order_service.exception.PaymentException;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import com.example.foodVilla.order_service.payment.RazorpayGateway;
import com.example.foodVilla.order_service.payment.RazorpayGateway.RazorpayOrder;
import com.example.foodVilla.order_service.payment.RazorpayGateway.RazorpayPayment;
import com.example.foodVilla.order_service.repository.OrderRepository;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import com.example.foodVilla.order_service.service.OrderService;
import com.example.foodVilla.order_service.service.OrderStatusTransitionValidator;
import com.example.foodVilla.order_service.service.PaymentPolicy;
import com.example.foodVilla.order_service.service.PaymentService;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The payment rules, with Razorpay itself stubbed out (no network, no secrets).
 * Signature <em>cryptography</em> is covered separately in RazorpaySdkGatewayTest;
 * here the gateway just answers "valid" or "invalid" and the tests check what
 * PaymentService does with that answer.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final long ORDER_ID = 42L;
    private static final String RZP_ORDER = "order_TESTabc123";
    private static final String RZP_PAYMENT = "pay_TESTdef456";
    private static final String SIGNATURE = "signature-from-checkout";

    private static final AuthenticatedUser OWNER = new AuthenticatedUser(7L, "diner@example.com", "USER");
    private static final AuthenticatedUser OTHER_USER = new AuthenticatedUser(8L, "someone-else@example.com", "USER");
    private static final AuthenticatedUser ADMIN = new AuthenticatedUser(1L, "admin@example.com", "ADMIN");

    // 10:00; the default order was created at 09:50, so it is 10 minutes old (TTL is 30).
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-25T10:00:00Z"), ZoneId.of("UTC"));

    /** A transaction manager that only counts on the caller to behave — enough for unit tests. */
    private static final PlatformTransactionManager NO_OP_TX = new PlatformTransactionManager() {
        @Override public TransactionStatus getTransaction(TransactionDefinition definition) { return new SimpleTransactionStatus(); }
        @Override public void commit(TransactionStatus status) { }
        @Override public void rollback(TransactionStatus status) { }
    };

    @Mock private OrderRepository orderRepository;
    @Mock private RazorpayGateway gateway;
    @Mock private OrderEventPublisher eventPublisher;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        PaymentPolicy policy = new PaymentPolicy(30, CLOCK);
        OrderService orderService = new OrderService();
        ReflectionTestUtils.setField(orderService, "paymentPolicy", policy);

        paymentService = new PaymentService(orderRepository, orderService, gateway, policy,
                new OrderStatusTransitionValidator(), eventPublisher, NO_OP_TX);

        lenient().when(gateway.isAvailable()).thenReturn(true);
        lenient().when(gateway.keyId()).thenReturn("rzp_test_publicKeyId");
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // 1. The amount comes from the order, not from the client
    // ------------------------------------------------------------------

    @Test
    void chargesTheAmountStoredOnTheOrderInPaise() {
        Order order = givenOrder(unpaidOrder());
        when(gateway.createOrder(anyLong(), anyString(), anyString(), anyMap()))
                .thenReturn(new RazorpayOrder(RZP_ORDER, 25000, "INR"));

        // No client amount at all: the order's own total is used.
        PaymentSessionResponse session = paymentService.createPayment(ORDER_ID, OWNER, null);

        verify(gateway).createOrder(eq(25000L), eq("INR"), eq("foodvilla-order-42"),
                eq(Map.of("orderId", "42", "userId", "7")));
        assertThat(session.amount()).isEqualTo(25000L);
        assertThat(session.currency()).isEqualTo("INR");
        assertThat(session.razorpayOrderId()).isEqualTo(RZP_ORDER);
        assertThat(session.orderId()).isEqualTo(ORDER_ID);
        assertThat(session.keyId()).isEqualTo("rzp_test_publicKeyId");
        assertThat(order.getRazorpayOrderId()).isEqualTo(RZP_ORDER);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void aMatchingClientAmountIsAccepted() {
        givenOrder(unpaidOrder());
        when(gateway.createOrder(anyLong(), anyString(), anyString(), anyMap()))
                .thenReturn(new RazorpayOrder(RZP_ORDER, 25000, "INR"));

        // 250 vs the stored 250.00 — equal numerically, whatever the scale.
        paymentService.createPayment(ORDER_ID, OWNER, new BigDecimal("250"));

        verify(gateway).createOrder(eq(25000L), anyString(), anyString(), anyMap());
    }

    @Test
    void aTamperedClientAmountIsRefusedAndNeverReachesRazorpay() {
        Order order = givenOrder(unpaidOrder());

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, new BigDecimal("1.00")),
                HttpStatus.CONFLICT, "AMOUNT_MISMATCH");

        verify(gateway, never()).createOrder(anyLong(), anyString(), anyString(), anyMap());
        assertThat(order.getRazorpayOrderId()).isNull();
    }

    @Test
    void repeatingCreateReusesTheSameRazorpayOrder() {
        Order order = givenOrder(unpaidOrder());
        when(gateway.createOrder(anyLong(), anyString(), anyString(), anyMap()))
                .thenReturn(new RazorpayOrder(RZP_ORDER, 25000, "INR"));
        when(gateway.fetchPayments(RZP_ORDER)).thenReturn(List.of());

        PaymentSessionResponse first = paymentService.createPayment(ORDER_ID, OWNER, null);
        PaymentSessionResponse second = paymentService.createPayment(ORDER_ID, OWNER, null);

        assertThat(second.razorpayOrderId()).isEqualTo(first.razorpayOrderId());
        verify(gateway, times(1)).createOrder(anyLong(), anyString(), anyString(), anyMap());
        assertThat(order.getRazorpayOrderId()).isEqualTo(RZP_ORDER);
    }

    // ------------------------------------------------------------------
    // 2. Only the owner (or an admin) can touch an order's payment
    // ------------------------------------------------------------------

    @Test
    void anotherUserCannotCreateAPaymentForSomeoneElsesOrder() {
        Order order = givenOrder(unpaidOrder());

        assertThatThrownBy(() -> paymentService.createPayment(ORDER_ID, OTHER_USER, null))
                .isInstanceOf(OrderAccessDeniedException.class);

        verify(gateway, never()).createOrder(anyLong(), anyString(), anyString(), anyMap());
        assertThat(order.getRazorpayOrderId()).isNull();
    }

    @Test
    void anotherUserCannotVerifyAPaymentForSomeoneElsesOrder() {
        Order order = givenOrder(startedOrder());
        givenValidSignature();

        assertThatThrownBy(() -> paymentService.verifyPayment(ORDER_ID, OTHER_USER, verifyRequest()))
                .isInstanceOf(OrderAccessDeniedException.class);

        // Even with a perfectly valid signature the order stays untouched.
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getPaymentId()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
        verify(eventPublisher, never()).publishStatusChanged(any(), any(), anyString());
    }

    @Test
    void anotherUserCannotReportAFailureOrSyncSomeoneElsesOrder() {
        Order order = givenOrder(startedOrder());

        assertThatThrownBy(() -> paymentService.reportFailure(ORDER_ID, OTHER_USER, failureRequest()))
                .isInstanceOf(OrderAccessDeniedException.class);
        assertThatThrownBy(() -> paymentService.syncPayment(ORDER_ID, OTHER_USER))
                .isInstanceOf(OrderAccessDeniedException.class);

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        verify(gateway, never()).fetchPayments(anyString());
    }

    @Test
    void anAdminMayCreateAPaymentOnBehalfOfACustomer() {
        givenOrder(unpaidOrder());
        when(gateway.createOrder(anyLong(), anyString(), anyString(), anyMap()))
                .thenReturn(new RazorpayOrder(RZP_ORDER, 25000, "INR"));

        PaymentSessionResponse session = paymentService.createPayment(ORDER_ID, ADMIN, null);

        assertThat(session.razorpayOrderId()).isEqualTo(RZP_ORDER);
    }

    // ------------------------------------------------------------------
    // 3. Successful signature verification
    // ------------------------------------------------------------------

    @Test
    void aValidSignatureMarksTheOrderPaidAndSendsItToTheRestaurant() {
        Order order = givenOrder(startedOrder());
        givenValidSignature();

        OrderResponse response = paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest());

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentId()).isEqualTo(RZP_PAYMENT);
        assertThat(order.getPaymentProvider()).isEqualTo("RAZORPAY_TEST");
        assertThat(order.getPaidAt()).isEqualTo(LocalDateTime.of(2026, 9, 25, 10, 0));
        // Paying is what makes the order valid for the restaurant.
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
        assertThat(order.getStatusHistory()).extracting(OrderStatusHistory::getStatus)
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);

        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(response.getPaymentId()).isEqualTo(RZP_PAYMENT);
        assertThat(response.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
        assertThat(response.getFinalAmount()).isEqualByComparingTo("250.00");

        verify(eventPublisher, times(1)).publishStatusChanged(
                any(Order.class), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void theOrderIsCheckedAgainstItsOwnRazorpayOrderNotJustTheSignature() {
        Order order = givenOrder(startedOrder());

        VerifyPaymentRequest fromAnotherOrder = new VerifyPaymentRequest(
                "order_SOMEONEELSES", RZP_PAYMENT, SIGNATURE);

        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, fromAnotherOrder),
                HttpStatus.BAD_REQUEST, "PAYMENT_ORDER_MISMATCH");

        verify(gateway, never()).verifySignature(anyString(), anyString(), anyString());
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void verifyBeforeAnyPaymentWasStartedIsRejected() {
        Order order = givenOrder(unpaidOrder());

        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest()),
                HttpStatus.CONFLICT, "PAYMENT_NOT_STARTED");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    // ------------------------------------------------------------------
    // 4. Invalid signature
    // ------------------------------------------------------------------

    @Test
    void anInvalidSignatureIsRejectedAndTheOrderIsNotMarkedPaid() {
        Order order = givenOrder(startedOrder());
        when(gateway.verifySignature(RZP_ORDER, RZP_PAYMENT, SIGNATURE)).thenReturn(false);

        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest()),
                HttpStatus.BAD_REQUEST, "INVALID_SIGNATURE");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getPaymentId()).isNull();
        assertThat(order.getPaidAt()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
        verify(orderRepository, never()).save(any(Order.class));
        verify(eventPublisher, never()).publishStatusChanged(any(), any(), anyString());
    }

    @Test
    void anInvalidSignatureCannotDisturbAnAlreadyPaidOrder() {
        Order order = givenOrder(paidOrder());
        when(gateway.verifySignature(anyString(), anyString(), anyString())).thenReturn(false);

        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest()),
                HttpStatus.BAD_REQUEST, "INVALID_SIGNATURE");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentId()).isEqualTo(RZP_PAYMENT);
    }

    // ------------------------------------------------------------------
    // 5. Duplicate verification is idempotent
    // ------------------------------------------------------------------

    @Test
    void verifyingTheSamePaymentTwiceAppliesItOnce() {
        Order order = givenOrder(startedOrder());
        givenValidSignature();

        OrderResponse first = paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest());
        LocalDateTime paidAt = order.getPaidAt();
        OrderResponse second = paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest());

        assertThat(second.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(second.getPaymentId()).isEqualTo(first.getPaymentId());
        assertThat(second.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
        assertThat(order.getPaidAt()).isEqualTo(paidAt);
        // One transition, one history entry, one saved change, one event.
        assertThat(order.getStatusHistory()).extracting(OrderStatusHistory::getStatus)
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        verify(orderRepository, times(1)).save(any(Order.class));
        verify(eventPublisher, times(1)).publishStatusChanged(any(), any(), anyString());
    }

    @Test
    void aDifferentPaymentCannotOverwriteAPaidOrder() {
        Order order = givenOrder(paidOrder());
        givenValidSignature();

        VerifyPaymentRequest anotherPayment = new VerifyPaymentRequest(RZP_ORDER, "pay_SECOND", SIGNATURE);
        when(gateway.verifySignature(RZP_ORDER, "pay_SECOND", SIGNATURE)).thenReturn(true);

        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, anotherPayment),
                HttpStatus.CONFLICT, "ORDER_ALREADY_PAID");

        assertThat(order.getPaymentId()).isEqualTo(RZP_PAYMENT);
        verify(orderRepository, never()).save(any(Order.class));
    }

    // ------------------------------------------------------------------
    // 6. Already-paid / not-payable / expired orders
    // ------------------------------------------------------------------

    @Test
    void anAlreadyPaidOrderCannotStartAnotherPayment() {
        givenOrder(paidOrder());

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, null),
                HttpStatus.CONFLICT, "ORDER_ALREADY_PAID");

        verify(gateway, never()).createOrder(anyLong(), anyString(), anyString(), anyMap());
        verify(gateway, never()).fetchPayments(anyString());
    }

    @Test
    void aCancelledOrderCannotBePaid() {
        Order order = unpaidOrder();
        order.setOrderStatus(OrderStatus.CANCELLED);
        givenOrder(order);

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, null),
                HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE");
    }

    @Test
    void anOrderPlacedBeforeOnlinePaymentsExistedDoesNotNeedPayment() {
        // Old orders sit in RESTAURANT_PENDING with payment_status PENDING and no payment.
        Order order = unpaidOrder();
        order.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        givenOrder(order);

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, null),
                HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE");
        verify(gateway, never()).createOrder(anyLong(), anyString(), anyString(), anyMap());
    }

    @Test
    void anOrderLeftUnpaidPastTheDeadlineHasExpired() {
        Order order = unpaidOrder();
        order.setCreatedAt(LocalDateTime.of(2026, 9, 25, 9, 0)); // 60 minutes old, TTL is 30
        givenOrder(order);

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, null),
                HttpStatus.GONE, "ORDER_EXPIRED");

        OrderResponse response = new OrderService() {{
            ReflectionTestUtils.setField(this, "paymentPolicy", new PaymentPolicy(30, CLOCK));
        }}.toResponse(order);
        assertThat(response.isPaymentExpired()).isTrue();
    }

    @Test
    void aPaymentThatWasAlreadyMadeIsStillAcceptedAfterTheDeadline() {
        // The customer paid at minute 29 and the confirmation arrived at minute 31:
        // the money is taken, so a valid signature must still win.
        Order order = startedOrder();
        order.setCreatedAt(LocalDateTime.of(2026, 9, 25, 9, 0));
        givenOrder(order);
        givenValidSignature();

        paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest());

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
    }

    @Test
    void aPaymentForAnOrderCancelledMeanwhileIsNotAppliedToIt() {
        Order order = startedOrder();
        order.setOrderStatus(OrderStatus.CANCELLED);
        givenOrder(order);
        givenValidSignature();

        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest()),
                HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void anUnknownOrderIsNotFound() {
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPayment(ORDER_ID, OWNER, null))
                .isInstanceOf(com.example.foodVilla.order_service.exception.ResourceNotFoundException.class);
    }

    // ------------------------------------------------------------------
    // 7. Payment failure handling
    // ------------------------------------------------------------------

    @Test
    void aReportedFailureIsRecordedButTheOrderStaysRetryable() {
        Order order = givenOrder(startedOrder());

        OrderResponse response = paymentService.reportFailure(ORDER_ID, OWNER, failureRequest());

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(order.getPaymentFailureReason()).isEqualTo("BAD_REQUEST_ERROR: Card declined");
        // A failed payment does not cancel or advance the order.
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
        verify(eventPublisher, never()).publishStatusChanged(any(), any(), anyString());
    }

    @Test
    void aReportedFailureCanNeverUndoAPaidOrder() {
        Order order = givenOrder(paidOrder());

        paymentService.reportFailure(ORDER_ID, OWNER, failureRequest());

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentFailureReason()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
    }

    @Test
    void aFailureReportMustNameTheOrdersOwnRazorpayOrder() {
        Order order = givenOrder(startedOrder());

        PaymentFailureRequest wrongOrder = new PaymentFailureRequest("order_OTHER", null, "X", "Y");
        assertPaymentError(() -> paymentService.reportFailure(ORDER_ID, OWNER, wrongOrder),
                HttpStatus.BAD_REQUEST, "PAYMENT_ORDER_MISMATCH");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void failureDescriptionsAreCleanedAndBounded() {
        Order order = givenOrder(startedOrder());

        paymentService.reportFailure(ORDER_ID, OWNER,
                new PaymentFailureRequest(RZP_ORDER, null, "CODE", "line1\nline2\t" + "x".repeat(600)));

        assertThat(order.getPaymentFailureReason()).hasSizeLessThanOrEqualTo(255);
        assertThat(order.getPaymentFailureReason()).doesNotContain("\n", "\t");
    }

    @Test
    void retryingAfterAFailureReusesTheRazorpayOrderAndResetsToPending() {
        Order order = startedOrder();
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setPaymentFailureReason("BAD_REQUEST_ERROR: Card declined");
        givenOrder(order);
        when(gateway.fetchPayments(RZP_ORDER)).thenReturn(List.of(
                new RazorpayPayment("pay_FAILED1", "failed", 25000, RZP_ORDER)));

        PaymentSessionResponse session = paymentService.createPayment(ORDER_ID, OWNER, null);

        assertThat(session.razorpayOrderId()).isEqualTo(RZP_ORDER);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getPaymentFailureReason()).isNull();
        verify(gateway, never()).createOrder(anyLong(), anyString(), anyString(), anyMap());
    }

    @Test
    void aValidSignatureStillWinsAfterAFailureWasReported() {
        // Razorpay Checkout lets the customer retry inside the same modal, so
        // payment.failed can be followed by a successful attempt.
        Order order = startedOrder();
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setPaymentFailureReason("BAD_REQUEST_ERROR: Card declined");
        givenOrder(order);
        givenValidSignature();

        paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest());

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentFailureReason()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
    }

    // ------------------------------------------------------------------
    // Refresh / lost-browser recovery
    // ------------------------------------------------------------------

    @Test
    void ifRazorpayAlreadyHasThePaymentReopeningCheckoutRecordsItInstead() {
        // The customer paid, then the page reloaded before /verify was called.
        Order order = givenOrder(startedOrder());
        when(gateway.fetchPayments(RZP_ORDER)).thenReturn(List.of(
                new RazorpayPayment(RZP_PAYMENT, "captured", 25000, RZP_ORDER)));

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, null),
                HttpStatus.CONFLICT, "ORDER_ALREADY_PAID");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentId()).isEqualTo(RZP_PAYMENT);
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
        verify(eventPublisher, times(1)).publishStatusChanged(any(), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void syncAppliesAPaymentRazorpayReportsForThisOrder() {
        Order order = givenOrder(startedOrder());
        when(gateway.fetchPayments(RZP_ORDER)).thenReturn(List.of(
                new RazorpayPayment("pay_FAILED1", "failed", 25000, RZP_ORDER),
                new RazorpayPayment(RZP_PAYMENT, "captured", 25000, RZP_ORDER)));

        OrderResponse response = paymentService.syncPayment(ORDER_ID, OWNER);

        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentId()).isEqualTo(RZP_PAYMENT);
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
    }

    @Test
    void syncIgnoresFailedPaymentsAndPaymentsForTheWrongAmount() {
        Order order = givenOrder(startedOrder());
        when(gateway.fetchPayments(RZP_ORDER)).thenReturn(List.of(
                new RazorpayPayment("pay_FAILED1", "failed", 25000, RZP_ORDER),
                new RazorpayPayment("pay_CHEAP", "captured", 100, RZP_ORDER),
                new RazorpayPayment("pay_ELSEWHERE", "captured", 25000, "order_OTHER")));

        OrderResponse response = paymentService.syncPayment(ORDER_ID, OWNER);

        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getPaymentId()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void syncOnAnAlreadyPaidOrderDoesNotCallRazorpay() {
        givenOrder(paidOrder());

        OrderResponse response = paymentService.syncPayment(ORDER_ID, OWNER);

        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        verify(gateway, never()).fetchPayments(anyString());
    }

    // ------------------------------------------------------------------
    // Resilience
    // ------------------------------------------------------------------

    @Test
    void aBrokerOutageAfterPaymentDoesNotTurnTheVerificationIntoAnError() {
        Order order = givenOrder(startedOrder());
        givenValidSignature();
        doThrow(new RuntimeException("broker unreachable"))
                .when(eventPublisher).publishStatusChanged(any(), any(), anyString());

        OrderResponse response = paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest());

        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
    }

    @Test
    void withoutRazorpayConfigurationPaymentEndpointsSayWhyInsteadOfFailing() {
        when(gateway.isAvailable()).thenReturn(false);
        when(gateway.unavailableReason()).thenReturn("Online payment is not configured on this server.");

        assertPaymentError(() -> paymentService.createPayment(ORDER_ID, OWNER, null),
                HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED");
        assertPaymentError(() -> paymentService.verifyPayment(ORDER_ID, OWNER, verifyRequest()),
                HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED");
        assertPaymentError(() -> paymentService.syncPayment(ORDER_ID, OWNER),
                HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED");

        PaymentConfigResponse config = paymentService.getConfig();
        assertThat(config.available()).isFalse();
        assertThat(config.mode()).isEqualTo("TEST");
        assertThat(config.message()).contains("not configured");
        verify(orderRepository, never()).findById(anyLong());
    }

    @Test
    void configReportsTestModeWhenPaymentsAreAvailable() {
        PaymentConfigResponse config = paymentService.getConfig();

        assertThat(config.available()).isTrue();
        assertThat(config.mode()).isEqualTo("TEST");
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private Order givenOrder(Order order) {
        lenient().when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        lenient().when(orderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        return order;
    }

    // lenient: several tests assert the request is refused BEFORE the signature is even checked.
    private void givenValidSignature() {
        lenient().when(gateway.verifySignature(RZP_ORDER, RZP_PAYMENT, SIGNATURE)).thenReturn(true);
    }

    /** CREATED + payment PENDING, no Razorpay order yet: 200 + 40 fee + 10 tax = 250.00. */
    private static Order unpaidOrder() {
        Order order = new Order();
        order.setId(ORDER_ID);
        order.setUserId(OWNER.userId());
        order.setCustomerEmail(OWNER.email());
        order.setRestaurantId(5L);
        order.setRestaurantName("Test Kitchen");
        order.setSubtotalAmount(new BigDecimal("200"));
        order.setDeliveryFee(new BigDecimal("40.00"));
        order.setTaxAmount(new BigDecimal("10.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setFinalAmount(new BigDecimal("250.00"));
        order.setOrderStatus(OrderStatus.CREATED);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setCreatedAt(LocalDateTime.of(2026, 9, 25, 9, 50));
        order.setItems(new ArrayList<>());
        order.setStatusHistory(new ArrayList<>());
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.CREATED, "Order placed, awaiting payment"));
        return order;
    }

    /** As above, and the customer has opened Razorpay Checkout (a Razorpay order exists). */
    private static Order startedOrder() {
        Order order = unpaidOrder();
        order.setRazorpayOrderId(RZP_ORDER);
        return order;
    }

    private static Order paidOrder() {
        Order order = startedOrder();
        order.setPaymentStatus(PaymentStatus.CONFIRMED);
        order.setPaymentId(RZP_PAYMENT);
        order.setPaymentProvider("RAZORPAY_TEST");
        order.setPaidAt(LocalDateTime.of(2026, 9, 25, 9, 55));
        order.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.RESTAURANT_PENDING, "Payment received"));
        return order;
    }

    private static VerifyPaymentRequest verifyRequest() {
        return new VerifyPaymentRequest(RZP_ORDER, RZP_PAYMENT, SIGNATURE);
    }

    private static PaymentFailureRequest failureRequest() {
        return new PaymentFailureRequest(RZP_ORDER, "pay_FAILED1", "BAD_REQUEST_ERROR", "Card declined");
    }

    private static void assertPaymentError(ThrowingCallable call, HttpStatus status, String code) {
        assertThatThrownBy(call).isInstanceOfSatisfying(PaymentException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }
}
