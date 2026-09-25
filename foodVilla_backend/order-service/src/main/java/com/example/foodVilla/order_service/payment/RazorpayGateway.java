package com.example.foodVilla.order_service.payment;

import java.util.List;
import java.util.Map;

/**
 * The only door to Razorpay. PaymentService depends on this interface rather
 * than on the SDK so the payment rules (ownership, amounts, idempotency,
 * signature handling) can be tested without any network access.
 */
public interface RazorpayGateway {

    /** True when test-mode credentials are configured and the SDK client is ready. */
    boolean isAvailable();

    /** Why payments are unavailable — safe to show to a user; never contains a secret. */
    String unavailableReason();

    /** The public key id Razorpay Checkout needs in the browser. Never the secret. */
    String keyId();

    /** Creates a Razorpay order for the given amount in paise (the smallest INR unit). */
    RazorpayOrder createOrder(long amountPaise, String currency, String receipt, Map<String, String> notes);

    /**
     * Checks Razorpay's signature over {@code razorpayOrderId|razorpayPaymentId}
     * with the API secret. Local HMAC check, no network. Returns false — never
     * throws — for anything that is not a valid signature.
     */
    boolean verifySignature(String razorpayOrderId, String razorpayPaymentId, String signature);

    /** Payment attempts Razorpay holds against one Razorpay order (network call). */
    List<RazorpayPayment> fetchPayments(String razorpayOrderId);

    record RazorpayOrder(String id, long amountPaise, String currency) {
    }

    record RazorpayPayment(String id, String status, long amountPaise, String orderId) {

        /** A payment that Razorpay has authorised or captured (test mode included). */
        public boolean isSuccessful() {
            return "captured".equals(status) || "authorized".equals(status);
        }
    }
}
