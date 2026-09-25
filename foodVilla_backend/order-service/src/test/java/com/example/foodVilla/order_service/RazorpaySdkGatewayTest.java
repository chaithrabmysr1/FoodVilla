package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.exception.PaymentException;
import com.example.foodVilla.order_service.payment.RazorpaySdkGateway;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The real razorpay-java gateway, exercised only where it needs no network:
 * configuration guards and signature verification. The expected signature is
 * computed here with plain HMAC-SHA256 — Razorpay's documented scheme is
 * HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret) — so
 * the SDK is checked against an independent implementation.
 *
 * The values below are made-up placeholders, not real credentials.
 */
class RazorpaySdkGatewayTest {

    private static final String TEST_KEY_ID = "rzp_test_PlaceholderKeyId";
    private static final String SECRET = "placeholder-secret-not-a-real-one";
    private static final String ORDER = "order_PlaceholderOrder1";
    private static final String PAYMENT = "pay_PlaceholderPayment1";

    @Test
    void startsUnavailableWithoutCredentialsInsteadOfFailing() {
        RazorpaySdkGateway gateway = new RazorpaySdkGateway("", "");

        assertThat(gateway.isAvailable()).isFalse();
        assertThat(gateway.unavailableReason()).containsIgnoringCase("not configured");
        assertThat(gateway.verifySignature(ORDER, PAYMENT, sign(ORDER, PAYMENT, SECRET))).isFalse();
        assertThatThrownBy(() -> gateway.createOrder(25000, "INR", "r", Map.of()))
                .isInstanceOfSatisfying(PaymentException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(ex.getCode()).isEqualTo("PAYMENT_NOT_CONFIGURED");
                });
        assertThatThrownBy(() -> gateway.fetchPayments(ORDER)).isInstanceOf(PaymentException.class);
    }

    @Test
    void oneMissingCredentialIsEnoughToDisablePayments() {
        assertThat(new RazorpaySdkGateway(TEST_KEY_ID, "").isAvailable()).isFalse();
        assertThat(new RazorpaySdkGateway("", SECRET).isAvailable()).isFalse();
        assertThat(new RazorpaySdkGateway(null, null).isAvailable()).isFalse();
        assertThat(new RazorpaySdkGateway("  ", "  ").isAvailable()).isFalse();
    }

    @Test
    void aLiveKeyIsRefusedSoRealMoneyCanNeverBeInvolved() {
        RazorpaySdkGateway gateway = new RazorpaySdkGateway("rzp_live_PlaceholderKeyId", SECRET);

        assertThat(gateway.isAvailable()).isFalse();
        assertThat(gateway.unavailableReason()).containsIgnoringCase("test key");
        // Not even a correctly signed payload is honoured on a refused key.
        assertThat(gateway.verifySignature(ORDER, PAYMENT, sign(ORDER, PAYMENT, SECRET))).isFalse();
        assertThatThrownBy(() -> gateway.createOrder(25000, "INR", "r", Map.of()))
                .isInstanceOf(PaymentException.class);
    }

    @Test
    void aTestKeyEnablesPaymentsAndExposesOnlyThePublicKeyId() {
        RazorpaySdkGateway gateway = new RazorpaySdkGateway("  " + TEST_KEY_ID + " ", " " + SECRET + " ");

        assertThat(gateway.isAvailable()).isTrue();
        assertThat(gateway.unavailableReason()).isNull();
        assertThat(gateway.keyId()).isEqualTo(TEST_KEY_ID);
        assertThat(gateway.toString()).doesNotContain(SECRET);
    }

    @Test
    void acceptsTheSignatureRazorpayWouldIssue() {
        RazorpaySdkGateway gateway = new RazorpaySdkGateway(TEST_KEY_ID, SECRET);

        assertThat(gateway.verifySignature(ORDER, PAYMENT, sign(ORDER, PAYMENT, SECRET))).isTrue();
    }

    @Test
    void rejectsEverythingThatIsNotThatSignature() {
        RazorpaySdkGateway gateway = new RazorpaySdkGateway(TEST_KEY_ID, SECRET);
        String valid = sign(ORDER, PAYMENT, SECRET);

        // signed with a different secret
        assertThat(gateway.verifySignature(ORDER, PAYMENT, sign(ORDER, PAYMENT, "some-other-secret"))).isFalse();
        // valid signature, but for a different payment / order than the ones presented
        assertThat(gateway.verifySignature(ORDER, "pay_Different", valid)).isFalse();
        assertThat(gateway.verifySignature("order_Different", PAYMENT, valid)).isFalse();
        // the two ids swapped
        assertThat(gateway.verifySignature(PAYMENT, ORDER, valid)).isFalse();
        // tampered / truncated / uppercased / garbage
        assertThat(gateway.verifySignature(ORDER, PAYMENT, valid.substring(1) + "0")).isFalse();
        assertThat(gateway.verifySignature(ORDER, PAYMENT, valid.substring(0, valid.length() - 1))).isFalse();
        assertThat(gateway.verifySignature(ORDER, PAYMENT, valid.toUpperCase())).isFalse();
        assertThat(gateway.verifySignature(ORDER, PAYMENT, "not-a-signature")).isFalse();
    }

    @Test
    void missingValuesAreAnInvalidSignatureNotAnError() {
        RazorpaySdkGateway gateway = new RazorpaySdkGateway(TEST_KEY_ID, SECRET);
        String valid = sign(ORDER, PAYMENT, SECRET);

        assertThat(gateway.verifySignature(null, PAYMENT, valid)).isFalse();
        assertThat(gateway.verifySignature(ORDER, null, valid)).isFalse();
        assertThat(gateway.verifySignature(ORDER, PAYMENT, null)).isFalse();
        assertThat(gateway.verifySignature("", "", "")).isFalse();
    }

    private static String sign(String orderId, String paymentId, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
