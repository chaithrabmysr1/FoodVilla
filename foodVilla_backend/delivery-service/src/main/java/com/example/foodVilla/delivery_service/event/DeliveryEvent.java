package com.example.foodVilla.delivery_service.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Published to kafka.topic.delivery-events. Must match the shape
 * order-service expects on the consuming side
 * (com.example.foodVilla.order_service.event.DeliveryEvent).
 */
public class DeliveryEvent {

    public enum Type { ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED }

    private String eventId;
    private Long orderId;
    private Long deliveryPartnerId;
    private Type type;
    private LocalDateTime occurredAt;

    public DeliveryEvent() {
    }

    public DeliveryEvent(Long orderId, Long deliveryPartnerId, Type type) {
        this.eventId = UUID.randomUUID().toString();
        this.orderId = orderId;
        this.deliveryPartnerId = deliveryPartnerId;
        this.type = type;
        this.occurredAt = LocalDateTime.now();
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getDeliveryPartnerId() { return deliveryPartnerId; }
    public void setDeliveryPartnerId(Long deliveryPartnerId) { this.deliveryPartnerId = deliveryPartnerId; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
