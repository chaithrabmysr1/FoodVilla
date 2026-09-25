package com.example.foodVilla.order_service.dto;

import java.util.List;

/**
 * Mirrors foodcatalogue-service's FoodCatalogueResponse shape returned by
 * GET /api/catalogue/{restaurantId}.
 */
public class CatalogueResponseDTO {
    private RestaurantDTO restaurant;
    private List<CatalogueFoodItemDTO> foodItems;

    public RestaurantDTO getRestaurant() { return restaurant; }
    public void setRestaurant(RestaurantDTO restaurant) { this.restaurant = restaurant; }

    public List<CatalogueFoodItemDTO> getFoodItems() { return foodItems; }
    public void setFoodItems(List<CatalogueFoodItemDTO> foodItems) { this.foodItems = foodItems; }
}
