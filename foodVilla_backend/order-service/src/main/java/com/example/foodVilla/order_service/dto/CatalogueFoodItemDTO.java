package com.example.foodVilla.order_service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Mirrors foodcatalogue-service's FoodItem JSON shape (its "veg" field is
 * serialized as "isVeg" via @JsonProperty — matched here so Jackson binds it).
 */
public class CatalogueFoodItemDTO {
    private Long id;
    private String itemName;

    @JsonProperty("isVeg")
    private boolean veg;

    private Long price;
    private String imageUrl;
    private Long restaurantId;
    private Integer quantity;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public boolean isVeg() { return veg; }
    public void setVeg(boolean veg) { this.veg = veg; }

    public Long getPrice() { return price; }
    public void setPrice(Long price) { this.price = price; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
