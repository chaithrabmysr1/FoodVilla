package com.example.foodVilla.foodcatalogue_service.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;


@Entity
@Table(name = "food_items")
public class FoodItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemName;

    @Column(name = "item_description")
    private String itemDescription;

    @Column(name = "veg", nullable = false)
    @JsonProperty("isVeg") // JSON will use "isVeg"
    private boolean veg = true; // JPA column stays "veg"

    private Long price;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    private Integer quantity;

    // ✅ Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getItemDescription() { return itemDescription; }
    public void setItemDescription(String itemDescription) { this.itemDescription = itemDescription; }

    // Only "isVeg" appears in JSON
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
