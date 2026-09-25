package com.example.foodVilla.order_service.payment;

import com.example.foodVilla.order_service.exception.PaymentException;
import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Razorpay via the official razorpay-java SDK — TEST MODE ONLY.
 *
 * The service starts without credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET);
 * this bean then reports itself unavailable and every payment call answers
 * 503 PAYMENT_NOT_CONFIGURED, while the rest of the application is unaffected.
 * A key that does not start with {@code rzp_test_} is refused outright, so a
 * live key pasted into the environment by mistake can never move real money.
 *
 * The secret lives in a private final field: it has no getter, is not part of
 * any log line, and only reaches the SDK.
 */
@Component
public class RazorpaySdkGateway implements RazorpayGateway {

    private static final Logger log = LoggerFactory.getLogger(RazorpaySdkGateway.class);

    static final String TEST_KEY_PREFIX = "rzp_test_";

    private final String keyId;
    private final String keySecret;
    private final RazorpayClient client;
    private final String unavailableReason;

    public RazorpaySdkGateway(@Value("${payment.razorpay.key-id:}") String keyId,
                              @Value("${payment.razorpay.key-secret:}") String keySecret) {
        String id = keyId == null ? "" : keyId.trim();
        String secret = keySecret == null ? "" : keySecret.trim();

        RazorpayClient built = null;
        String reason = null;
        if (id.isEmpty() || secret.isEmpty()) {
            reason = "Online payment is not configured on this server "
                    + "(Razorpay test keys are missing).";
            log.info("Razorpay payments disabled: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. "
                    + "Browsing and the rest of the app work; paying for an order does not.");
        } else if (!id.startsWith(TEST_KEY_PREFIX)) {
            reason = "Online payment is disabled: only Razorpay TEST keys are accepted "
                    + "and the configured key is not a test key.";
            log.error("Razorpay payments disabled: RAZORPAY_KEY_ID does not start with '{}'. "
                    + "This app only supports Razorpay TEST MODE and refuses live keys.", TEST_KEY_PREFIX);
        } else {
            try {
                built = new RazorpayClient(id, secret);
                log.info("Razorpay payments enabled in TEST MODE (no real money is processed).");
            } catch (RazorpayException ex) {
                reason = "Online payment is unavailable: the payment provider could not be initialised.";
                log.error("Razorpay payments disabled: could not initialise the SDK client: {}", ex.getMessage());
            }
        }

        this.keyId = id;
        this.keySecret = secret;
        this.client = built;
        this.unavailableReason = reason;
    }

    @Override
    public boolean isAvailable() {
        return client != null;
    }

    @Override
    public String unavailableReason() {
        return unavailableReason;
    }

    @Override
    public String keyId() {
        return keyId;
    }

    @Override
    public RazorpayOrder createOrder(long amountPaise, String currency, String receipt, Map<String, String> notes) {
        requireClient();
        try {
            JSONObject request = new JSONObject();
            request.put("amount", amountPaise);
            request.put("currency", currency);
            request.put("receipt", receipt);
            request.put("notes", new JSONObject(notes));

            Order created = client.orders.create(request);
            JSONObject json = created.toJson();
            return new RazorpayOrder(json.getString("id"), json.getLong("amount"), json.getString("currency"));
        } catch (RazorpayException ex) {
            throw providerError("create the Razorpay order", ex);
        }
    }

    @Override
    public boolean verifySignature(String razorpayOrderId, String razorpayPaymentId, String signature) {
        if (!isAvailable()
                || isBlank(razorpayOrderId) || isBlank(razorpayPaymentId) || isBlank(signature)) {
            return false;
        }
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", razorpayOrderId);
            attributes.put("razorpay_payment_id", razorpayPaymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, keySecret);
        } catch (Exception ex) {
            // Anything other than a clean "yes" is a "no".
            return false;
        }
    }

    @Override
    public List<RazorpayPayment> fetchPayments(String razorpayOrderId) {
        requireClient();
        try {
            List<RazorpayPayment> payments = new ArrayList<>();
            for (Payment payment : client.orders.fetchPayments(razorpayOrderId)) {
                JSONObject json = payment.toJson();
                payments.add(new RazorpayPayment(
                        json.getString("id"),
                        json.optString("status", ""),
                        json.optLong("amount", -1L),
                        json.optString("order_id", "")));
            }
            return payments;
        } catch (RazorpayException ex) {
            throw providerError("look up the Razorpay payments", ex);
        }
    }

    private void requireClient() {
        if (client == null) {
            throw new PaymentException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED", unavailableReason);
        }
    }

    private PaymentException providerError(String action, RazorpayException ex) {
        // The SDK message comes from Razorpay's response (e.g. "Authentication failed");
        // it never includes the credentials we sent.
        log.warn("Could not {}: {}", action, ex.getMessage());
        return new PaymentException(HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR",
                "We couldn't reach the payment provider. Please try again in a moment.");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
