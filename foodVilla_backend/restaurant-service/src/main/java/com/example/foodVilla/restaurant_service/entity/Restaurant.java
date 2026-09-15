package com.example.foodVilla.restaurant_service.entity;



import jakarta.persistence.*;

@Entity
@Table(name = "restaurants")
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private double rating;
    private String deliveryTime;
    private String address;
    private String imageUrl;
    private int costForTwo;
    private boolean isOpen;

    // ✅ Default constructor
    public Restaurant() {
    }

    // ✅ Parameterized constructor
    public Restaurant(Long id, String name, String description, double rating, String deliveryTime, String address, String imageUrl) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.rating = rating;
        this.deliveryTime = deliveryTime;
        this.address = address;
        this.imageUrl = imageUrl;
    }

    // ✅ Getters and Setters
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }

    public double getRating() {
        return rating;
    }
    public void setRating(double rating) {
        this.rating = rating;
    }

    public String getDeliveryTime() {
        return deliveryTime;
    }
    public void setDeliveryTime(String deliveryTime) {
        this.deliveryTime = deliveryTime;
    }

    public String getAddress() {
        return address;
    }
    public void setAddress(String address) {
        this.address = address;
    }

    public String getImageUrl() {
        return imageUrl;
    }
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public int getCostForTwo() {
        return costForTwo;
    }
    public void setCostForTwo(int costForTwo) {
        this.costForTwo = costForTwo;
    }

    public boolean getIsOpen() {
        return isOpen;
    }
    public void setIsOpen(boolean isOpen) {
        this.isOpen = isOpen;
    }
}
