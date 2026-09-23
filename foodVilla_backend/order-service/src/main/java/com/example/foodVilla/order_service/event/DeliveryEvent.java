package com.example.foodVilla.order_service.event;

import java.time.LocalDateTime;

/**
 * Consumed from kafka.topic.delivery-events. Published by delivery-service
 * (Phase 6) as a delivery partner is assigned and moves the order through
 * pickup/delivery.
 */
public class DeliveryEvent {

    public enum Type { ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED }

    private String eventId;
    private Long orderId;
    private Long deliveryPartnerId;
    private Type type;
    private LocalDateTime occurredAt;

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
