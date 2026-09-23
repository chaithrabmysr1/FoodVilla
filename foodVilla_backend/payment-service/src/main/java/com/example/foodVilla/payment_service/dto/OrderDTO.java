package com.example.foodVilla.payment_service.dto;

import java.math.BigDecimal;

/**
 * Mirrors just the fields payment-service needs from order-service's
 * GET /api/orders/{id} response. Extra fields in the real response are
 * simply ignored by Jackson.
 */
public class OrderDTO {
    private Long id;
    private String orderStatus;
    private String paymentStatus;
    private BigDecimal finalAmount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getFinalAmount() { return finalAmount; }
    public void setFinalAmount(BigDecimal finalAmount) { this.finalAmount = finalAmount; }
}
