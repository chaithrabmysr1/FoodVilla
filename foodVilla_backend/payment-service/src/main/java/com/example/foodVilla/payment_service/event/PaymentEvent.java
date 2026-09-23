package com.example.foodVilla.payment_service.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Published to kafka.topic.payment-events. Must match the shape order-service
 * expects on the consuming side (com.example.foodVilla.order_service.event.PaymentEvent) —
 * each service keeps its own copy rather than sharing a library, consistent
 * with how RestaurantDTO/FoodItem DTOs are duplicated elsewhere in this project.
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

    public PaymentEvent() {
    }

    public PaymentEvent(Long orderId, Type type, String paymentId, String amount, String reason) {
        this.eventId = UUID.randomUUID().toString();
        this.orderId = orderId;
        this.type = type;
        this.paymentId = paymentId;
        this.amount = amount;
        this.reason = reason;
        this.occurredAt = LocalDateTime.now();
    }

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
