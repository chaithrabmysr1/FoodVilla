package com.example.foodVilla.restaurant_service.service;


import com.example.foodVilla.restaurant_service.entity.Restaurant;
import com.example.foodVilla.restaurant_service.exception.ResourceNotFoundException;
import com.example.foodVilla.restaurant_service.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    public Optional<Restaurant> getRestaurantById(Long id) {
        return restaurantRepository.findById(id);
    }

    public Restaurant addRestaurant(Restaurant restaurant) {
        return restaurantRepository.save(restaurant);
    }

    public Restaurant updateRestaurant(Long id, Restaurant updated) {
        return restaurantRepository.findById(id).map(restaurant -> {
            restaurant.setName(updated.getName());
            restaurant.setDescription(updated.getDescription());
            restaurant.setRating(updated.getRating());
            restaurant.setDeliveryTime(updated.getDeliveryTime());
            restaurant.setAddress(updated.getAddress());
            restaurant.setImageUrl(updated.getImageUrl());
            return restaurantRepository.save(restaurant);
        }).orElseThrow(() -> new ResourceNotFoundException("Restaurant not found with ID: " + id));
    }

    public void deleteRestaurant(Long id) {
        if (!restaurantRepository.existsById(id)) {
            throw new ResourceNotFoundException("Restaurant not found with ID: " + id);
        }
        restaurantRepository.deleteById(id);
    }



}
