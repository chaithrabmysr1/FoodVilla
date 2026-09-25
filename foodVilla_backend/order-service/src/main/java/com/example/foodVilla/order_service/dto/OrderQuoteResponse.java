package com.example.foodVilla.order_service.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * The priced bill for a cart, computed by the same rules createOrder applies
 * but without saving anything — so checkout can show real delivery fee, tax and
 * total before the customer commits.
 */
public record OrderQuoteResponse(List<OrderItemResponse> items, BigDecimal subtotalAmount,
                                 BigDecimal deliveryFee, BigDecimal taxAmount,
                                 BigDecimal discountAmount, BigDecimal finalAmount,
                                 String currency) {
}
