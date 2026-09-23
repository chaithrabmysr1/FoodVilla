package com.example.foodVilla.payment_service.dto;

import jakarta.validation.constraints.NotNull;

public class InitiatePaymentRequest {

    @NotNull
    private Long orderId;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
}
