package com.example.foodVilla.delivery_service.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateDeliveryPartnerRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String phone;

    private String vehicleType;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
}
