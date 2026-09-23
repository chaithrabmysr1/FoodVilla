package com.example.foodVilla.delivery_service.controller;

import com.example.foodVilla.delivery_service.dto.CreateDeliveryPartnerRequest;
import com.example.foodVilla.delivery_service.dto.PublicDeliveryPartnerResponse;
import com.example.foodVilla.delivery_service.dto.UpdateDeliveryPartnerRequest;
import com.example.foodVilla.delivery_service.entity.DeliveryPartner;
import com.example.foodVilla.delivery_service.service.DeliveryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/delivery/partners")
@CrossOrigin(origins = "${cors.allowed.origin}")
public class DeliveryPartnerController {

    private final DeliveryService deliveryService;

    public DeliveryPartnerController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @PostMapping
    public ResponseEntity<DeliveryPartner> create(@Valid @RequestBody CreateDeliveryPartnerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deliveryService.createPartner(request));
    }

    @GetMapping
    public ResponseEntity<List<DeliveryPartner>> list(
            @RequestParam(required = false) Boolean available) {
        return ResponseEntity.ok(deliveryService.listPartners(available));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeliveryPartner> update(
            @PathVariable Long id, @RequestBody UpdateDeliveryPartnerRequest request) {
        return ResponseEntity.ok(deliveryService.updatePartner(id, request));
    }

    // Customer-facing (any authenticated user, not just ADMIN) — order
    // tracking needs to display who's delivering without exposing
    // operator-only fields (availability/active) or requiring an
    // order-ownership check here (the id itself is opaque, and a name/phone
    // is no more sensitive than restaurant contact info already is).
    @GetMapping("/{id}/public")
    public ResponseEntity<PublicDeliveryPartnerResponse> getPublicInfo(@PathVariable Long id) {
        DeliveryPartner partner = deliveryService.getPartnerOrThrow(id);
        PublicDeliveryPartnerResponse response = new PublicDeliveryPartnerResponse();
        response.setId(partner.getId());
        response.setName(partner.getName());
        response.setPhone(partner.getPhone());
        response.setVehicleType(partner.getVehicleType());
        return ResponseEntity.ok(response);
    }
}
