package com.example.foodVilla.order_service.dto;

import com.example.foodVilla.order_service.entity.OrderStatus;

import java.time.LocalDateTime;

public class OrderStatusHistoryResponse {
    private OrderStatus status;
    private LocalDateTime changedAt;
    private String note;

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
