package com.example.foodVilla.order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The three values Razorpay Checkout hands to the browser after a payment attempt. */
public record VerifyPaymentRequest(
        @NotBlank @Size(max = 64) String razorpayOrderId,
        @NotBlank @Size(max = 64) String razorpayPaymentId,
        @NotBlank @Size(max = 256) String razorpaySignature) {
}
