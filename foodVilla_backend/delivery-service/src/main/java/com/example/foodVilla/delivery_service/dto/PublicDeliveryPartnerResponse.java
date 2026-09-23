package com.example.foodVilla.delivery_service.dto;

// Minimal display info for customer-facing order tracking (mobile/web) — no
// availability/active flags, those are operator-only concerns.
public class PublicDeliveryPartnerResponse {
    private Long id;
    private String name;
    private String phone;
    private String vehicleType;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
}
