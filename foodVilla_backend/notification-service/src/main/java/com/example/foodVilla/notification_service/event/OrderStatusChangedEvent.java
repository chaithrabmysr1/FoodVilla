package com.example.foodVilla.notification_service.event;

import java.time.LocalDateTime;

/**
 * Consumed from kafka.topic.order-events. Must match order-service's
 * producer-side shape (com.example.foodVilla.order_service.event.OrderStatusChangedEvent).
 * order-service re-publishes here on every transition regardless of origin
 * (customer action, payment/restaurant/delivery Kafka event, or admin REST
 * call) — this is the ONLY topic notification-service needs to consume to
 * cover the entire order lifecycle.
 */
public class OrderStatusChangedEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private Long restaurantId;
    private String previousStatus;
    private String newStatus;
    private String note;
    private LocalDateTime occurredAt;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
