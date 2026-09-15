package com.example.foodVilla.foodcatalogue_service.controller;

import com.example.foodVilla.foodcatalogue_service.dto.FoodCatalogueResponse;
import com.example.foodVilla.foodcatalogue_service.entity.FoodItem;
import com.example.foodVilla.foodcatalogue_service.service.FoodCatalogueService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalogue")
@CrossOrigin(origins = "http://localhost:5173")
public class FoodCatalogueController {

    @Autowired
    private FoodCatalogueService catalogueService;

    @GetMapping("/{restaurantId}")
    public ResponseEntity<FoodCatalogueResponse> getCatalogue(@PathVariable Long restaurantId) {
        return catalogueService.getCatalogue(restaurantId);
    }

    @PostMapping
    public ResponseEntity<FoodItem> addFoodItem(@Valid @RequestBody FoodItem item) {
        return catalogueService.addFoodItem(item);
    }

    // Note: intentionally not @Valid here — updateFoodItem supports partial
    // updates (see FoodCatalogueService), so required-field constraints
    // meant for creation would incorrectly reject legitimate partial bodies.
    @PutMapping("/{id}")
    public ResponseEntity<FoodItem> updateFoodItem(@PathVariable Long id, @RequestBody FoodItem item) {
        return catalogueService.updateFoodItem(id, item);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFoodItem(@PathVariable Long id) {
        return catalogueService.deleteFoodItem(id);
    }

    @GetMapping
    public ResponseEntity<List<FoodItem>> getAllFoodItems() {
        return catalogueService.getAllFoodItems();
    }
}

