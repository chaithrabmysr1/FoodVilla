package com.example.foodVilla.order_service.dto;

/**
 * Mirrors the restaurant shape returned inside foodcatalogue-service's
 * GET /api/catalogue/{restaurantId} response. Deliberately does not include
 * isOpen — foodcatalogue-service's own internal RestaurantDTO doesn't carry
 * it either, so it never reaches this response (see plan's known limitation).
 */
public class RestaurantDTO {
    private Long id;
    private String name;
    private String description;
    private double rating;
    private String deliveryTime;
    private String address;
    private String imageUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
