package com.example.foodVilla.delivery_service.dto;

import jakarta.validation.constraints.NotNull;

public class AssignDeliveryRequest {

    @NotNull
    private Long orderId;

    private Long restaurantId;

    @NotNull
    private Long deliveryPartnerId;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public Long getDeliveryPartnerId() { return deliveryPartnerId; }
    public void setDeliveryPartnerId(Long deliveryPartnerId) { this.deliveryPartnerId = deliveryPartnerId; }
}
