package com.example.foodVilla.payment_service.provider;

import com.example.foodVilla.payment_service.entity.Payment;
import com.example.foodVilla.payment_service.exception.PaymentProcessingException;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.json.JSONObject;

import java.math.BigDecimal;

/**
 * Real Razorpay integration (order creation + webhook signature
 * verification), built against the documented razorpay-java SDK surface.
 *
 * NOT exercised by any automated test in this repo and not verified against
 * a live Razorpay account — there were no test-mode credentials available
 * while building this. Before relying on it: set RAZORPAY_KEY_ID/
 * RAZORPAY_KEY_SECRET to your Razorpay test-mode keys, set
 * PAYMENT_PROVIDER=razorpay, and run the initiate -> checkout -> webhook
 * flow end-to-end yourself.
 */
@Component("razorpay")
public class RazorpayPaymentProvider implements PaymentProvider {

    @Value("${payment.razorpay.key-id}")
    private String keyId;

    @Value("${payment.razorpay.key-secret}")
    private String keySecret;

    @Override
    public String createProviderOrder(Payment payment) {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject orderRequest = new JSONObject();
            // Razorpay amounts are in the smallest currency unit (paise for INR).
            long amountInPaise = payment.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .longValueExact();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", payment.getCurrency());
            orderRequest.put("receipt", "order-" + payment.getOrderId());

            Order order = client.orders.create(orderRequest);
            return order.get("id");
        } catch (RazorpayException ex) {
            throw new PaymentProcessingException("Failed to create Razorpay order: " + ex.getMessage());
        }
    }

    /**
     * Verifies the X-Razorpay-Signature header on an incoming webhook call
     * against the raw request body, using RAZORPAY_KEY_SECRET as the
     * webhook secret. Returns false (never throws) on any mismatch or
     * verification error so callers can uniformly reject with 400.
     */
    public boolean verifyWebhookSignature(String payload, String signatureHeader) {
        try {
            return Utils.verifyWebhookSignature(payload, signatureHeader, keySecret);
        } catch (RazorpayException ex) {
            return false;
        }
    }
}
