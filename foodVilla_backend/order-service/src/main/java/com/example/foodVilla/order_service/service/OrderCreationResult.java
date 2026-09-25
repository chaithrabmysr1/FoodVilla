package com.example.foodVilla.order_service.service;

import com.example.foodVilla.order_service.entity.Order;

/**
 * created=false means an order with this (userId, idempotencyKey) already
 * existed and was returned as-is rather than creating a duplicate.
 */
public record OrderCreationResult(Order order, boolean created) {
}
