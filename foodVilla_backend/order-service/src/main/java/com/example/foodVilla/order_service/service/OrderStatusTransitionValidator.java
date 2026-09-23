package com.example.foodVilla.order_service.service;

import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.exception.InvalidOrderStatusTransitionException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * The single source of truth for which order-status transitions are legal.
 * Pure Java, no Spring context needed — later phases (payment, restaurant,
 * delivery workflows) should call this rather than re-implement the rules.
 *
 * CANCELLED is only reachable up through RESTAURANT_ACCEPTED: once the
 * restaurant starts preparing food, cancellation closes. A restaurant
 * rejection is also represented as RESTAURANT_PENDING -> CANCELLED (with a
 * note in OrderStatusHistory) since there's no distinct REJECTED status.
 */
@Component
public class OrderStatusTransitionValidator {

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = new EnumMap<>(OrderStatus.class);

    static {
        TRANSITIONS.put(OrderStatus.CREATED,
                EnumSet.of(OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.PAYMENT_PENDING,
                EnumSet.of(OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.PAYMENT_CONFIRMED,
                EnumSet.of(OrderStatus.RESTAURANT_PENDING, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.RESTAURANT_PENDING,
                EnumSet.of(OrderStatus.RESTAURANT_ACCEPTED, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.RESTAURANT_ACCEPTED,
                EnumSet.of(OrderStatus.PREPARING, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.PREPARING,
                EnumSet.of(OrderStatus.READY_FOR_PICKUP));
        TRANSITIONS.put(OrderStatus.READY_FOR_PICKUP,
                EnumSet.of(OrderStatus.DELIVERY_PARTNER_ASSIGNED));
        TRANSITIONS.put(OrderStatus.DELIVERY_PARTNER_ASSIGNED,
                EnumSet.of(OrderStatus.PICKED_UP));
        TRANSITIONS.put(OrderStatus.PICKED_UP,
                EnumSet.of(OrderStatus.OUT_FOR_DELIVERY));
        TRANSITIONS.put(OrderStatus.OUT_FOR_DELIVERY,
                EnumSet.of(OrderStatus.DELIVERED));
        TRANSITIONS.put(OrderStatus.DELIVERED, EnumSet.noneOf(OrderStatus.class));
        TRANSITIONS.put(OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class));
        TRANSITIONS.put(OrderStatus.PAYMENT_FAILED, EnumSet.noneOf(OrderStatus.class));
    }

    public void validateTransition(OrderStatus current, OrderStatus target) {
        Set<OrderStatus> allowed = TRANSITIONS.get(current);
        if (allowed == null || !allowed.contains(target)) {
            throw new InvalidOrderStatusTransitionException(
                    "Cannot transition order from " + current + " to " + target);
        }
    }

    public void validateCancellable(OrderStatus current) {
        validateTransition(current, OrderStatus.CANCELLED);
    }
}
