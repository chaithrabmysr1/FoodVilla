package com.example.foodVilla.order_service.dto;

/**
 * Everything Razorpay Checkout needs in the browser. {@code amount} is in paise
 * (the unit Checkout expects); {@code keyId} is the PUBLIC key id — the secret
 * never leaves the backend.
 */
public record PaymentSessionResponse(Long orderId, String razorpayOrderId, long amount,
                                     String currency, String keyId) {
}
