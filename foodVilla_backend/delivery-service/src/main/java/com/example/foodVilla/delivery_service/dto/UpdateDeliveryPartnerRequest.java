package com.example.foodVilla.delivery_service.dto;

public class UpdateDeliveryPartnerRequest {
    private String name;
    private String phone;
    private String vehicleType;
    private Boolean available;
    private Boolean active;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
