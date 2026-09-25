package com.example.foodVilla.order_service.dto;

/**
 * Lets the checkout page know up front whether paying is possible, so it can
 * explain that instead of creating an order that cannot be paid. {@code mode}
 * is always TEST — live keys are refused by the gateway.
 */
public record PaymentConfigResponse(boolean available, String mode, String message) {
}
