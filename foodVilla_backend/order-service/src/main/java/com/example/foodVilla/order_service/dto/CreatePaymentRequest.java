package com.example.foodVilla.order_service.dto;

import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * {@code amount} (rupees) is advisory only: the server always charges the total
 * stored on the order. If it is present and differs, the request is refused
 * rather than silently charging a different figure than the customer saw.
 */
public record CreatePaymentRequest(@Positive BigDecimal amount) {
}
