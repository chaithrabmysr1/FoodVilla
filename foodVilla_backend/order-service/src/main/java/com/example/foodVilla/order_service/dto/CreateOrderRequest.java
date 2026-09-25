package com.example.foodVilla.order_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class CreateOrderRequest {

    @NotNull
    private Long restaurantId;

    @NotEmpty(message = "order must contain at least one item")
    @Valid
    private List<OrderItemRequest> items;

    @NotNull
    @Valid
    private DeliveryAddressRequest deliveryAddress;

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public List<OrderItemRequest> getItems() { return items; }
    public void setItems(List<OrderItemRequest> items) { this.items = items; }

    public DeliveryAddressRequest getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(DeliveryAddressRequest deliveryAddress) { this.deliveryAddress = deliveryAddress; }
}
