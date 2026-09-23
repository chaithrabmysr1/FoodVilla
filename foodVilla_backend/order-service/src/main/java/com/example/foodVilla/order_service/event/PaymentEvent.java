package com.example.foodVilla.order_service.event;

import java.time.LocalDateTime;

/**
 * Consumed from kafka.topic.payment-events. Published by payment-service
 * (Phase 4). One envelope with a type discriminator rather than three
 * separate event classes — order-service maps each type to a specific
 * status transition in PaymentEventConsumer.
 */
public class PaymentEvent {

    public enum Type { INITIATED, SUCCESS, FAILED }

    private String eventId;
    private Long orderId;
    private Type type;
    private String paymentId;
    private String amount;
    private String reason;
    private LocalDateTime occurredAt;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public String getAmount() { return amount; }
    public void setAmount(String amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
