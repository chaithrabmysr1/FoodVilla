package com.example.foodVilla.order_service.event;

import java.time.LocalDateTime;

/**
 * Consumed from kafka.topic.restaurant-events. Published by
 * restaurant-service (Phase 5) when staff accept/reject an order or update
 * its kitchen status. REJECTED maps to CANCELLED — there's no distinct
 * rejected status (see OrderStatusTransitionValidator).
 */
public class RestaurantEvent {

    public enum Type { ACCEPTED, REJECTED, PREPARING, READY }

    private String eventId;
    private Long orderId;
    private Long restaurantId;
    private Type type;
    private String reason;
    private LocalDateTime occurredAt;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
