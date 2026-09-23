package com.example.foodVilla.notification_service.dto;

import jakarta.validation.constraints.NotBlank;

public class DeviceTokenRequest {

    @NotBlank
    private String deviceToken;

    @NotBlank
    private String platform; // "ios" | "android"

    public String getDeviceToken() { return deviceToken; }
    public void setDeviceToken(String deviceToken) { this.deviceToken = deviceToken; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
}
