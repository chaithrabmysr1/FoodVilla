package com.example.foodVilla.payment_service;

import com.example.foodVilla.payment_service.dto.PaymentResponse;
import com.example.foodVilla.payment_service.entity.Payment;
import com.example.foodVilla.payment_service.entity.PaymentProviderType;
import com.example.foodVilla.payment_service.entity.PaymentStatus;
import com.example.foodVilla.payment_service.exception.PaymentProcessingException;
import com.example.foodVilla.payment_service.messaging.PaymentEventPublisher;
import com.example.foodVilla.payment_service.provider.PaymentProvider;
import com.example.foodVilla.payment_service.provider.RazorpayPaymentProvider;
import com.example.foodVilla.payment_service.repository.PaymentRepository;
import com.example.foodVilla.payment_service.security.AuthenticatedUser;
import com.example.foodVilla.payment_service.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * A double-click on "Pay" (or a retried initiate request) must not create a
 * second in-flight payment attempt or allow paying twice for the same order
 * — see the Phase 4 plan's idempotency design.
 */
class PaymentServiceIdempotencyTest {

    private PaymentRepository paymentRepository;
    private PaymentService paymentService;
    private final AuthenticatedUser principal = new AuthenticatedUser(1L, "user@example.com", "USER");

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        PaymentEventPublisher eventPublisher = mock(PaymentEventPublisher.class);
        RestTemplate restTemplate = mock(RestTemplate.class);
        PaymentProvider mockProvider = mock(PaymentProvider.class);
        RazorpayPaymentProvider razorpayPaymentProvider = mock(RazorpayPaymentProvider.class);

        paymentService = new PaymentService();
        ReflectionTestUtils.setField(paymentService, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(paymentService, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(paymentService, "eventPublisher", eventPublisher);
        ReflectionTestUtils.setField(paymentService, "providers", Map.of("mock", mockProvider));
        ReflectionTestUtils.setField(paymentService, "razorpayPaymentProvider", razorpayPaymentProvider);
        ReflectionTestUtils.setField(paymentService, "activeProviderName", "mock");
        ReflectionTestUtils.setField(paymentService, "orderServiceUrl", "http://localhost:8084/api/orders/");
        ReflectionTestUtils.setField(paymentService, "razorpayKeyIdProperty", "");
    }

    private Payment pendingPayment() {
        Payment payment = new Payment();
        payment.setId(99L);
        payment.setOrderId(5L);
        payment.setUserId(1L);
        payment.setAmount(new BigDecimal("250.00"));
        payment.setCurrency("INR");
        payment.setProvider(PaymentProviderType.MOCK);
        payment.setProviderOrderId("mock_order_abc");
        payment.setStatus(PaymentStatus.PENDING);
        return payment;
    }

    @Test
    void repeatedInitiateReturnsExistingPendingPaymentInsteadOfCreatingANewOne() {
        Payment existing = pendingPayment();
        org.mockito.Mockito.when(paymentRepository.findByOrderIdOrderByCreatedAtDesc(5L))
                .thenReturn(List.of(existing));

        PaymentResponse response = paymentService.initiatePayment(principal, 5L, "Bearer token");

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        // No new Payment was persisted, no order-service call was made, and no
        // second provider order/INITIATED event was created — this really did
        // short-circuit before doing anything, not coincidentally match.
        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void initiateAfterSuccessIsRejected() {
        Payment succeeded = pendingPayment();
        succeeded.setStatus(PaymentStatus.SUCCESS);
        succeeded.setProviderPaymentId("mock_pay_xyz");
        org.mockito.Mockito.when(paymentRepository.findByOrderIdOrderByCreatedAtDesc(5L))
                .thenReturn(List.of(succeeded));

        assertThatThrownBy(() -> paymentService.initiatePayment(principal, 5L, "Bearer token"))
                .isInstanceOf(PaymentProcessingException.class)
                .hasMessageContaining("already been paid");

        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
