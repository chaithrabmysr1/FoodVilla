package com.example.foodVilla.delivery_service.controller;

import com.example.foodVilla.delivery_service.dto.AssignDeliveryRequest;
import com.example.foodVilla.delivery_service.entity.DeliveryAssignment;
import com.example.foodVilla.delivery_service.service.DeliveryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/delivery/assignments")
@CrossOrigin(origins = "${cors.allowed.origin}")
public class DeliveryAssignmentController {

    private final DeliveryService deliveryService;

    public DeliveryAssignmentController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @PostMapping
    public ResponseEntity<DeliveryAssignment> assign(@Valid @RequestBody AssignDeliveryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deliveryService.assignDelivery(request));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<DeliveryAssignment> accept(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.acceptAssignment(id));
    }

    @PutMapping("/{id}/picked-up")
    public ResponseEntity<DeliveryAssignment> pickedUp(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.markPickedUp(id));
    }

    @PutMapping("/{id}/out-for-delivery")
    public ResponseEntity<DeliveryAssignment> outForDelivery(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.markOutForDelivery(id));
    }

    @PutMapping("/{id}/delivered")
    public ResponseEntity<DeliveryAssignment> delivered(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.markDelivered(id));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<DeliveryAssignment> getForOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(deliveryService.getAssignmentForOrder(orderId));
    }
}
