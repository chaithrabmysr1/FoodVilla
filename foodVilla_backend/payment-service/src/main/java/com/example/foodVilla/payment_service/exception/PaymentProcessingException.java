package com.example.foodVilla.payment_service.exception;

/**
 * Thrown for a payment request that's well-formed but can't proceed given
 * the order's current state (e.g. already paid, order not in a payable
 * state, wrong provider for this action) — a 409, not a validation or
 * not-found error.
 */
public class PaymentProcessingException extends RuntimeException {
    public PaymentProcessingException(String message) {
        super(message);
    }
}
