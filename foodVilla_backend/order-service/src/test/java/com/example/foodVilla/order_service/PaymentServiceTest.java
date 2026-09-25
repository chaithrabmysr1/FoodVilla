package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.PayOrderRequest;
import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.OrderStatusHistory;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import com.example.foodVilla.order_service.exception.OrderAccessDeniedException;
import com.example.foodVilla.order_service.exception.PaymentException;
import com.example.foodVilla.order_service.exception.ResourceNotFoundException;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * The payment rules: what PaymentService accepts, refuses and records when a
 * customer pays an order with dummy details. There is no payment gateway to
 * stub — the payment is simulated — so this exercises the service directly.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final long ORDER_ID = 42L;

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
    @Mock private OrderEventPublisher eventPublisher;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        PaymentPolicy policy = new PaymentPolicy(30, CLOCK);
        OrderService orderService = new OrderService();
        ReflectionTestUtils.setField(orderService, "paymentPolicy", policy);

        paymentService = new PaymentService(orderRepository, orderService, policy,
                new OrderStatusTransitionValidator(), eventPublisher, NO_OP_TX);

        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // 1. Paying confirms the order and hands it to the restaurant
    // ------------------------------------------------------------------

    @Test
    void payingConfirmsTheOrderAndSendsItToTheRestaurant() {
        Order order = givenOrder(unpaidOrder());

        OrderResponse response = paymentService.payOrder(ORDER_ID, OWNER, request("CARD", "Visa •••• 1111", null));

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
        assertThat(order.getPaymentId()).matches("FVPAY[A-Z2-9]{12}");
        assertThat(order.getPaymentProvider()).isEqualTo("DEMO");
        assertThat(order.getPaymentMethod()).isEqualTo("CARD");
        assertThat(order.getPaymentDetail()).isEqualTo("Visa •••• 1111");
        assertThat(order.getPaidAt()).isEqualTo(LocalDateTime.of(2026, 9, 25, 10, 0));
        assertThat(order.getStatusHistory()).extracting(OrderStatusHistory::getStatus)
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(response.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
        assertThat(response.getPaymentId()).isEqualTo(order.getPaymentId());
        assertThat(response.getPaymentMethod()).isEqualTo("CARD");
        verify(eventPublisher, times(1)).publishStatusChanged(any(Order.class), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void everySupportedMethodCanPayAndTheMethodIsRecorded() {
        for (String method : new String[]{"UPI", "CARD", "NETBANKING", "PAYTM", "PAYPAL"}) {
            Order order = givenOrder(unpaidOrder());

            paymentService.payOrder(ORDER_ID, OWNER, request(method, null, null));

            assertThat(order.getPaymentStatus()).as(method).isEqualTo(PaymentStatus.CONFIRMED);
            assertThat(order.getPaymentMethod()).as(method).isEqualTo(method);
        }
    }

    @Test
    void theMethodIsCaseInsensitive() {
        Order order = givenOrder(unpaidOrder());

        paymentService.payOrder(ORDER_ID, OWNER, request("upi", null, null));

        assertThat(order.getPaymentMethod()).isEqualTo("UPI");
    }

    @Test
    void eachPaymentGetsItsOwnReceiptId() {
        Order first = givenOrder(unpaidOrder());
        paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null));
        Order second = givenOrder(unpaidOrder());
        paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null));

        assertThat(first.getPaymentId()).isNotEqualTo(second.getPaymentId());
    }

    @Test
    void aFailedEarlierAttemptCanStillBePaid() {
        Order order = unpaidOrder();
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setPaymentFailureReason("Card declined");
        givenOrder(order);

        paymentService.payOrder(ORDER_ID, OWNER, request("UPI", "ab•••@okhdfcbank", null));

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentFailureReason()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.RESTAURANT_PENDING);
    }

    // ------------------------------------------------------------------
    // 2. The amount comes from the order, not from the client
    // ------------------------------------------------------------------

    @Test
    void aMatchingClientAmountIsAccepted() {
        Order order = givenOrder(unpaidOrder());

        // 250 vs the stored 250.00 — equal numerically, whatever the scale.
        paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, new BigDecimal("250")));

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
    }

    @Test
    void aTamperedClientAmountIsRefusedAndNothingChanges() {
        Order order = givenOrder(unpaidOrder());

        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, new BigDecimal("1.00"))),
                HttpStatus.CONFLICT, "AMOUNT_MISMATCH");

        assertUnchanged(order);
    }

    // ------------------------------------------------------------------
    // 3. Only the owner (or an admin) can pay an order
    // ------------------------------------------------------------------

    @Test
    void anotherUserCannotPayAndNothingChanges() {
        Order order = givenOrder(unpaidOrder());

        assertThatThrownBy(() -> paymentService.payOrder(ORDER_ID, OTHER_USER, request("UPI", null, null)))
                .isInstanceOf(OrderAccessDeniedException.class);

        assertUnchanged(order);
    }

    @Test
    void anAdminMayPayOnBehalfOfACustomer() {
        Order order = givenOrder(unpaidOrder());

        paymentService.payOrder(ORDER_ID, ADMIN, request("UPI", null, null));

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
    }

    @Test
    void anUnknownOrderIsNotFound() {
        lenient().when(orderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ------------------------------------------------------------------
    // 4. The method must be one we support
    // ------------------------------------------------------------------

    @Test
    void anUnknownMethodIsRefusedBeforeTheOrderIsTouched() {
        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("BITCOIN", null, null)),
                HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_METHOD");

        verify(orderRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void aBlankMethodIsRefused() {
        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request(" ", null, null)),
                HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_METHOD");
    }

    // ------------------------------------------------------------------
    // 5. The receipt label is display-only and is cleaned up
    // ------------------------------------------------------------------

    @Test
    void theDetailIsTrimmedStrippedOfControlCharactersAndCapped() {
        Order order = givenOrder(unpaidOrder());

        paymentService.payOrder(ORDER_ID, OWNER, request("PAYPAL", "  a\nb\tc " + "x".repeat(100), null));

        assertThat(order.getPaymentDetail()).hasSize(64).startsWith("a b c x").doesNotContain("\n", "\t");
    }

    @Test
    void aBlankDetailIsStoredAsNothing() {
        Order order = givenOrder(unpaidOrder());

        paymentService.payOrder(ORDER_ID, OWNER, request("NETBANKING", "   ", null));

        assertThat(order.getPaymentDetail()).isNull();
    }

    // ------------------------------------------------------------------
    // 6. Orders that cannot be paid
    // ------------------------------------------------------------------

    @Test
    void anAlreadyPaidOrderIsNotPaidAgain() {
        Order order = givenOrder(paidOrder());
        String receipt = order.getPaymentId();

        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null)),
                HttpStatus.CONFLICT, "ORDER_ALREADY_PAID");

        assertThat(order.getPaymentId()).isEqualTo(receipt);
        assertThat(order.getStatusHistory()).hasSize(2);
        verify(eventPublisher, never()).publishStatusChanged(any(Order.class), any(), anyString());
    }

    @Test
    void aCancelledOrderCannotBePaid() {
        Order order = unpaidOrder();
        order.setOrderStatus(OrderStatus.CANCELLED);
        givenOrder(order);

        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null)),
                HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void anOrderAlreadyWithTheRestaurantButUnpaidCannotBePaid() {
        // Placed before online payments existed: nothing to collect now.
        Order order = unpaidOrder();
        order.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        givenOrder(order);

        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null)),
                HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE");

        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void anOrderLeftUnpaidTooLongHasExpired() {
        Order order = unpaidOrder();
        order.setCreatedAt(LocalDateTime.of(2026, 9, 25, 9, 0)); // 60 minutes old, TTL is 30
        givenOrder(order);

        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null)),
                HttpStatus.GONE, "ORDER_EXPIRED");

        assertUnchanged(order);
    }

    // ------------------------------------------------------------------
    // 7. A broker problem never undoes a recorded payment
    // ------------------------------------------------------------------

    @Test
    void aFailingEventPublishDoesNotFailThePayment() {
        Order order = givenOrder(unpaidOrder());
        doThrow(new IllegalStateException("broker down"))
                .when(eventPublisher).publishStatusChanged(any(Order.class), any(), anyString());

        OrderResponse response = paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, null));

        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
    }

    @Test
    void aRefusedPaymentPublishesNothing() {
        givenOrder(unpaidOrder());

        assertPaymentError(() -> paymentService.payOrder(ORDER_ID, OWNER, request("UPI", null, new BigDecimal("1"))),
                HttpStatus.CONFLICT, "AMOUNT_MISMATCH");

        verify(eventPublisher, never()).publishStatusChanged(any(Order.class), any(), anyString());
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private Order givenOrder(Order order) {
        lenient().when(orderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        return order;
    }

    private static PayOrderRequest request(String method, String detail, BigDecimal amount) {
        return new PayOrderRequest(method, detail, amount);
    }

    private static void assertUnchanged(Order order) {
        assertThat(order.getPaymentStatus()).isNotEqualTo(PaymentStatus.CONFIRMED);
        assertThat(order.getPaymentId()).isNull();
        assertThat(order.getPaymentMethod()).isNull();
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(order.getStatusHistory()).hasSize(1);
    }

    /** CREATED + payment PENDING: 200 + 40 fee + 10 tax = 250.00. */
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

    private static Order paidOrder() {
        Order order = unpaidOrder();
        order.setPaymentStatus(PaymentStatus.CONFIRMED);
        order.setPaymentId("FVPAYEXISTING1");
        order.setPaymentProvider("DEMO");
        order.setPaymentMethod("UPI");
        order.setPaidAt(LocalDateTime.of(2026, 9, 25, 9, 55));
        order.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.RESTAURANT_PENDING, "Payment received"));
        return order;
    }

    private static void assertPaymentError(ThrowingCallable call, HttpStatus status, String code) {
        assertThatThrownBy(call).isInstanceOfSatisfying(PaymentException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }
}
