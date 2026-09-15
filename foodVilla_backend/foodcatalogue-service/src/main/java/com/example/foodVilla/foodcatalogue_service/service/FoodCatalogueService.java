package com.example.foodVilla.foodcatalogue_service.service;

import com.example.foodVilla.foodcatalogue_service.dto.FoodCatalogueResponse;
import com.example.foodVilla.foodcatalogue_service.dto.RestaurantDTO;
import com.example.foodVilla.foodcatalogue_service.entity.FoodItem;
import com.example.foodVilla.foodcatalogue_service.repository.FoodItemRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;

@Service
public class FoodCatalogueService {

    @Autowired
    private FoodItemRepository foodRepo;

    @Autowired
    private RestTemplate restTemplate;

    private static final String RESTAURANT_SERVICE_URL = "http://restaurant-service/api/restaurants/";

    // ✅ Get restaurant + its food items
    public ResponseEntity<FoodCatalogueResponse> getCatalogue(Long restaurantId) {
        RestaurantDTO restaurant =
                restTemplate.getForObject(RESTAURANT_SERVICE_URL + restaurantId, RestaurantDTO.class);

        List<FoodItem> items = foodRepo.findByRestaurantId(restaurantId);

        FoodCatalogueResponse response = new FoodCatalogueResponse();
        response.setRestaurant(restaurant);
        response.setFoodItems(items);

        return ResponseEntity.ok(response);
    }

    // ✅ Add new food item
    public ResponseEntity<FoodItem> addFoodItem(FoodItem item) {
        if (item.getRestaurantId() == null) {
            throw new IllegalArgumentException("restaurantId must not be null");
        }
        FoodItem saved = foodRepo.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @Transactional
    public ResponseEntity<FoodItem> updateFoodItem(Long id, FoodItem item) {
        Optional<FoodItem> existingOpt = foodRepo.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FoodItem existing = existingOpt.get();

        if (item.getItemName() != null) existing.setItemName(item.getItemName());
        if (item.getItemDescription() != null) existing.setItemDescription(item.getItemDescription());
        if (item.getPrice() != null) existing.setPrice(item.getPrice());
        if (item.getImageUrl() != null) existing.setImageUrl(item.getImageUrl());
        if (item.getRestaurantId() != null) existing.setRestaurantId(item.getRestaurantId());
        if (item.getQuantity() != null) existing.setQuantity(item.getQuantity());

        existing.setVeg(item.isVeg());

        FoodItem updated = foodRepo.save(existing);
        return ResponseEntity.ok(updated);
    }

    // ✅ Delete food item
    public ResponseEntity<Void> deleteFoodItem(Long id) {
        if (!foodRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        foodRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ✅ Get all food items
    public ResponseEntity<List<FoodItem>> getAllFoodItems() {
        return ResponseEntity.ok(foodRepo.findAll());
    }
}

