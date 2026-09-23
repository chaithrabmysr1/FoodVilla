package com.example.foodVilla.payment_service.service;

import com.example.foodVilla.payment_service.dto.OrderDTO;
import com.example.foodVilla.payment_service.dto.PaymentResponse;
import com.example.foodVilla.payment_service.entity.Payment;
import com.example.foodVilla.payment_service.entity.PaymentProviderType;
import com.example.foodVilla.payment_service.entity.PaymentStatus;
import com.example.foodVilla.payment_service.event.PaymentEvent;
import com.example.foodVilla.payment_service.exception.PaymentProcessingException;
import com.example.foodVilla.payment_service.exception.ResourceNotFoundException;
import com.example.foodVilla.payment_service.messaging.PaymentEventPublisher;
import com.example.foodVilla.payment_service.provider.PaymentProvider;
import com.example.foodVilla.payment_service.provider.RazorpayPaymentProvider;
import com.example.foodVilla.payment_service.repository.PaymentRepository;
import com.example.foodVilla.payment_service.security.AuthenticatedUser;
import jakarta.transaction.Transactional;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private PaymentEventPublisher eventPublisher;

    @Autowired
    private Map<String, PaymentProvider> providers;

    @Autowired
    private RazorpayPaymentProvider razorpayPaymentProvider;

    @Value("${payment.provider}")
    private String activeProviderName;

    @Value("${order.service.url}")
    private String orderServiceUrl;

    @Value("${payment.razorpay.key-id}")
    private String razorpayKeyIdProperty;

    private static final String ADMIN_ROLE = "ADMIN";

    @Transactional
    public PaymentResponse initiatePayment(AuthenticatedUser principal, Long orderId, String rawAuthHeader) {
        List<Payment> existing = paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        if (!existing.isEmpty()) {
            Payment latest = existing.get(0);
            if (latest.getStatus() == PaymentStatus.SUCCESS) {
                throw new PaymentProcessingException("This order has already been paid for");
            }
            if (latest.getStatus() == PaymentStatus.PENDING) {
                // Same in-flight attempt — return it rather than creating a
                // parallel provider order for the same payment.
                return toResponse(latest);
            }
            // Latest was FAILED — fall through and create a fresh attempt.
        }

        OrderDTO order = fetchOrder(orderId, rawAuthHeader);
        if (!"CREATED".equals(order.getOrderStatus())) {
            throw new PaymentProcessingException(
                    "Order is not awaiting payment (current status: " + order.getOrderStatus() + ")");
        }

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setUserId(principal.userId());
        payment.setAmount(order.getFinalAmount());
        payment.setCurrency("INR");
        payment.setProvider(PaymentProviderType.valueOf(activeProviderName.toUpperCase()));
        payment.setStatus(PaymentStatus.PENDING);

        PaymentProvider provider = resolveProvider();
        payment.setProviderOrderId(provider.createProviderOrder(payment));

        Payment saved = paymentRepository.save(payment);
        eventPublisher.publish(new PaymentEvent(orderId, PaymentEvent.Type.INITIATED,
                null, saved.getAmount().toString(), null));

        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse confirmMockPayment(Long paymentId, AuthenticatedUser principal) {
        Payment payment = findOwnedPaymentOrThrow(paymentId, principal);
        if (payment.getProvider() != PaymentProviderType.MOCK) {
            throw new PaymentProcessingException("Only mock-provider payments can be confirmed via this endpoint");
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new PaymentProcessingException("Payment is not pending (current status: " + payment.getStatus() + ")");
        }

        payment.setProviderPaymentId("mock_pay_" + UUID.randomUUID());
        payment.setStatus(PaymentStatus.SUCCESS);
        Payment saved = paymentRepository.save(payment);

        eventPublisher.publish(new PaymentEvent(saved.getOrderId(), PaymentEvent.Type.SUCCESS,
                saved.getProviderPaymentId(), saved.getAmount().toString(), null));

        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse failMockPayment(Long paymentId, AuthenticatedUser principal, String reason) {
        Payment payment = findOwnedPaymentOrThrow(paymentId, principal);
        if (payment.getProvider() != PaymentProviderType.MOCK) {
            throw new PaymentProcessingException("Only mock-provider payments can be failed via this endpoint");
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new PaymentProcessingException("Payment is not pending (current status: " + payment.getStatus() + ")");
        }

        String failureReason = (reason == null || reason.isBlank()) ? "Simulated payment failure" : reason;
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(failureReason);
        Payment saved = paymentRepository.save(payment);

        eventPublisher.publish(new PaymentEvent(saved.getOrderId(), PaymentEvent.Type.FAILED,
                null, saved.getAmount().toString(), failureReason));

        return toResponse(saved);
    }

    /**
     * Handles a Razorpay webhook call. The signature is verified before the
     * payload is trusted at all — an invalid signature throws and the
     * controller responds 400, never touching payment state.
     * See RazorpayPaymentProvider for the caveat that this path is untested
     * against a live Razorpay account.
     */
    @Transactional
    public void handleRazorpayWebhook(String payload, String signatureHeader) {
        if (!razorpayPaymentProvider.verifyWebhookSignature(payload, signatureHeader)) {
            throw new PaymentProcessingException("Invalid webhook signature");
        }

        JSONObject body = new JSONObject(payload);
        String eventType = body.optString("event", "");
        JSONObject paymentEntity = body.optJSONObject("payload") != null
                ? body.getJSONObject("payload").optJSONObject("payment")
                : null;
        if (paymentEntity == null) {
            return; // Not a payment event we care about (e.g. refund/order events) — ignore.
        }
        JSONObject entity = paymentEntity.optJSONObject("entity");
        if (entity == null) {
            return;
        }

        String providerOrderId = entity.optString("order_id", null);
        String providerPaymentId = entity.optString("id", null);
        if (providerOrderId == null) {
            return;
        }

        Payment payment = paymentRepository.findByProviderOrderId(providerOrderId).orElse(null);
        if (payment == null || payment.getStatus() != PaymentStatus.PENDING) {
            // Unknown order, or we've already processed this payment (Razorpay
            // may redeliver the same webhook) — idempotent no-op either way.
            return;
        }

        if ("payment.captured".equals(eventType)) {
            payment.setProviderPaymentId(providerPaymentId);
            payment.setStatus(PaymentStatus.SUCCESS);
            paymentRepository.save(payment);
            eventPublisher.publish(new PaymentEvent(payment.getOrderId(), PaymentEvent.Type.SUCCESS,
                    providerPaymentId, payment.getAmount().toString(), null));
        } else if ("payment.failed".equals(eventType)) {
            String reason = entity.optString("error_description", "Payment failed");
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(reason);
            paymentRepository.save(payment);
            eventPublisher.publish(new PaymentEvent(payment.getOrderId(), PaymentEvent.Type.FAILED,
                    null, payment.getAmount().toString(), reason));
        }
    }

    public List<PaymentResponse> getPaymentsForOrder(Long orderId, AuthenticatedUser principal) {
        List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        if (!payments.isEmpty()) {
            ensureOwnerOrAdmin(payments.get(0), principal);
        }
        return payments.stream().map(this::toResponse).toList();
    }

    private PaymentProvider resolveProvider() {
        PaymentProvider provider = providers.get(activeProviderName);
        if (provider == null) {
            throw new IllegalStateException("Unknown payment.provider: " + activeProviderName);
        }
        return provider;
    }

    private OrderDTO fetchOrder(Long orderId, String rawAuthHeader) {
        try {
            HttpHeaders headers = new HttpHeaders();
            if (rawAuthHeader != null) {
                headers.set(HttpHeaders.AUTHORIZATION, rawAuthHeader);
            }
            var response = restTemplate.exchange(
                    orderServiceUrl + orderId, HttpMethod.GET, new HttpEntity<>(headers), OrderDTO.class);
            OrderDTO order = response.getBody();
            if (order == null) {
                throw new ResourceNotFoundException("Order not found with ID: " + orderId);
            }
            return order;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Order not found with ID: " + orderId);
        } catch (HttpClientErrorException.Forbidden ex) {
            throw new PaymentProcessingException("You do not have access to this order");
        }
    }

    private Payment findOwnedPaymentOrThrow(Long paymentId, AuthenticatedUser principal) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with ID: " + paymentId));
        ensureOwnerOrAdmin(payment, principal);
        return payment;
    }

    private void ensureOwnerOrAdmin(Payment payment, AuthenticatedUser principal) {
        boolean isOwner = payment.getUserId().equals(principal.userId());
        boolean isAdmin = ADMIN_ROLE.equals(principal.role());
        if (!isOwner && !isAdmin) {
            throw new PaymentProcessingException("You do not have access to this payment");
        }
    }

    private PaymentResponse toResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setOrderId(payment.getOrderId());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setProvider(payment.getProvider());
        response.setProviderOrderId(payment.getProviderOrderId());
        response.setStatus(payment.getStatus());
        response.setFailureReason(payment.getFailureReason());
        response.setCreatedAt(payment.getCreatedAt());
        if (payment.getProvider() == PaymentProviderType.RAZORPAY) {
            response.setRazorpayKeyId(razorpayKeyId());
        }
        return response;
    }

    private String razorpayKeyId() {
        return razorpayKeyIdProperty;
    }
}
