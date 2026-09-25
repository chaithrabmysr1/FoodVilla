package com.example.foodVilla.order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * What the customer chose in the payment step.
 *
 * <ul>
 *   <li>{@code method} — UPI, CARD, NETBANKING, PAYTM or PAYPAL.</li>
 *   <li>{@code detail} — a short, already-masked label for the receipt
 *       ("Visa •••• 1111", "HDFC Bank"). Display only: it is never used to decide
 *       anything, and the browser never sends a full card number, CVV or expiry.</li>
 *   <li>{@code amount} (rupees) — advisory. The order's stored total is what is
 *       paid; if this is present and differs the request is refused rather than
 *       settling a different figure than the customer saw.</li>
 * </ul>
 */
public record PayOrderRequest(
        @NotBlank @Size(max = 32) String method,
        @Size(max = 64) String detail,
        @Positive BigDecimal amount) {
}
