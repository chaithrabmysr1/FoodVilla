package com.example.foodVilla.restaurant_service.controlller;

import com.example.foodVilla.restaurant_service.dto.RejectOrderRequest;
import com.example.foodVilla.restaurant_service.event.RestaurantEvent;
import com.example.foodVilla.restaurant_service.messaging.RestaurantEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Restaurant-side order actions (accept/reject/start preparing/mark ready).
 * There is no restaurant-staff account model yet (only USER/ADMIN exist —
 * see the Phase 5 plan's documented simplification), so these are ADMIN-only
 * for now, representing what a real restaurant-owner portal would expose.
 *
 * These endpoints only publish a Kafka event — order-service (the owner of
 * order state) consumes it and applies the actual status transition
 * asynchronously, so the response here is just an acknowledgement, not the
 * updated order.
 */
@RestController
@RequestMapping("/api/restaurants/{restaurantId}/orders/{orderId}")
public class RestaurantOrderController {

    private final RestaurantEventPublisher eventPublisher;

    public RestaurantOrderController(RestaurantEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    @PutMapping("/accept")
    public ResponseEntity<Map<String, Object>> accept(
            @PathVariable Long restaurantId, @PathVariable Long orderId) {
        eventPublisher.publish(new RestaurantEvent(orderId, restaurantId, RestaurantEvent.Type.ACCEPTED, null));
        return acknowledged(orderId, restaurantId, "Order acceptance published");
    }

    @PutMapping("/reject")
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable Long restaurantId, @PathVariable Long orderId,
            @RequestBody(required = false) RejectOrderRequest request) {
        String reason = request != null ? request.getReason() : null;
        eventPublisher.publish(new RestaurantEvent(orderId, restaurantId, RestaurantEvent.Type.REJECTED, reason));
        return acknowledged(orderId, restaurantId, "Order rejection published");
    }

    @PutMapping("/preparing")
    public ResponseEntity<Map<String, Object>> preparing(
            @PathVariable Long restaurantId, @PathVariable Long orderId) {
        eventPublisher.publish(new RestaurantEvent(orderId, restaurantId, RestaurantEvent.Type.PREPARING, null));
        return acknowledged(orderId, restaurantId, "Preparation-started published");
    }

    @PutMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready(
            @PathVariable Long restaurantId, @PathVariable Long orderId) {
        eventPublisher.publish(new RestaurantEvent(orderId, restaurantId, RestaurantEvent.Type.READY, null));
        return acknowledged(orderId, restaurantId, "Food-ready published");
    }

    private ResponseEntity<Map<String, Object>> acknowledged(Long orderId, Long restaurantId, String message) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("orderId", orderId, "restaurantId", restaurantId, "message", message));
    }
}
