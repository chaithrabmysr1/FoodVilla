package com.example.foodVilla.order_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** A cart to price — like CreateOrderRequest but without the address, which a quote does not need. */
public record OrderQuoteRequest(
        @NotNull Long restaurantId,
        @NotEmpty(message = "order must contain at least one item") @Valid List<OrderItemRequest> items) {
}
