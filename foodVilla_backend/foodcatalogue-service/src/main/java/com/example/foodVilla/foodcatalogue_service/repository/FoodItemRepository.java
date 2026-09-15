package com.example.foodVilla.foodcatalogue_service.repository;

import com.example.foodVilla.foodcatalogue_service.entity.FoodItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {
    List<FoodItem> findByRestaurantId(Long restaurantId);
}
