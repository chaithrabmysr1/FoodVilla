package com.example.foodVilla.restaurant_service.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Published to kafka.topic.restaurant-events. Must match the shape
 * order-service expects on the consuming side
 * (com.example.foodVilla.order_service.event.RestaurantEvent).
 */
public class RestaurantEvent {

    public enum Type { ACCEPTED, REJECTED, PREPARING, READY }

    private String eventId;
    private Long orderId;
    private Long restaurantId;
    private Type type;
    private String reason;
    private LocalDateTime occurredAt;

    public RestaurantEvent() {
    }

    public RestaurantEvent(Long orderId, Long restaurantId, Type type, String reason) {
        this.eventId = UUID.randomUUID().toString();
        this.orderId = orderId;
        this.restaurantId = restaurantId;
        this.type = type;
        this.reason = reason;
        this.occurredAt = LocalDateTime.now();
    }

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
