package com.example.foodVilla.foodcatalogue_service.dto;

import com.example.foodVilla.foodcatalogue_service.entity.FoodItem;
import java.util.List;

public class FoodCatalogueResponse {
    private RestaurantDTO restaurant;
    private List<FoodItem> foodItems;

    // ✅ Getters & Setters
    public RestaurantDTO getRestaurant() { return restaurant; }
    public void setRestaurant(RestaurantDTO restaurant) { this.restaurant = restaurant; }

    public List<FoodItem> getFoodItems() { return foodItems; }
    public void setFoodItems(List<FoodItem> foodItems) { this.foodItems = foodItems; }
}
