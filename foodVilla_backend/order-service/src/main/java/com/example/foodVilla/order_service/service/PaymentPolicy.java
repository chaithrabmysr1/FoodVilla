package com.example.foodVilla.order_service.service;

import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * When an order may still be paid for. Kept in one place because both the
 * payment endpoints (to refuse) and the order response (to tell the web app
 * "expired") must agree.
 *
 * An order is only payable while it is still CREATED — that is, it has not yet
 * been handed to the restaurant — and not yet paid. Orders placed before online
 * payments existed sit in RESTAURANT_PENDING or later with payment_status
 * PENDING; they are not payable and never expire.
 */
@Component
public class PaymentPolicy {

    private final Duration pendingOrderTtl;
    private final Clock clock;

    public PaymentPolicy(@Value("${payment.pending-order-ttl-minutes:30}") long ttlMinutes, Clock clock) {
        this.pendingOrderTtl = Duration.ofMinutes(ttlMinutes);
        this.clock = clock;
    }

    public boolean isAwaitingPayment(Order order) {
        return order.getOrderStatus() == OrderStatus.CREATED
                && order.getPaymentStatus() != PaymentStatus.CONFIRMED;
    }

    public boolean isExpired(Order order) {
        return isAwaitingPayment(order)
                && order.getCreatedAt() != null
                && order.getCreatedAt().plus(pendingOrderTtl).isBefore(LocalDateTime.now(clock));
    }

    public LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
