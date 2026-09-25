package com.example.foodVilla.order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Reported by the browser when Razorpay Checkout raises {@code payment.failed}.
 * Client-supplied, so it can only ever record a failure on a payment that is
 * still unpaid — it can never mark an order paid, and never undoes a paid one.
 */
public record PaymentFailureRequest(
        @NotBlank @Size(max = 64) String razorpayOrderId,
        @Size(max = 64) String razorpayPaymentId,
        @Size(max = 64) String code,
        @Size(max = 500) String description) {
}
