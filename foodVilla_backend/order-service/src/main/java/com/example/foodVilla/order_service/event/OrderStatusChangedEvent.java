package com.example.foodVilla.order_service.event;

import com.example.foodVilla.order_service.entity.OrderStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Published to kafka.topic.order-events by order-service on every status
 * transition (including creation). This is the single fan-out point other
 * services can react to — rather than ten granular topics, one event stream
 * per order aggregate, filterable by newStatus. No service in this repo
 * consumes it now that notification-service is gone. Keyed by orderId on
 * publish so all events for one order land on the same partition and are
 * delivered in order.
 */
public class OrderStatusChangedEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private Long restaurantId;
    private OrderStatus previousStatus;
    private OrderStatus newStatus;
    private String note;
    private LocalDateTime occurredAt;

    public OrderStatusChangedEvent() {
    }

    public OrderStatusChangedEvent(Long orderId, Long userId, Long restaurantId,
                                    OrderStatus previousStatus, OrderStatus newStatus, String note) {
        this.eventId = UUID.randomUUID().toString();
        this.orderId = orderId;
        this.userId = userId;
        this.restaurantId = restaurantId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.note = note;
        this.occurredAt = LocalDateTime.now();
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public OrderStatus getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(OrderStatus previousStatus) { this.previousStatus = previousStatus; }

    public OrderStatus getNewStatus() { return newStatus; }
    public void setNewStatus(OrderStatus newStatus) { this.newStatus = newStatus; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
