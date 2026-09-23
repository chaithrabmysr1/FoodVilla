package com.example.foodVilla.user_service.dto;

import jakarta.validation.constraints.Pattern;

public class UpdateRoleRequest {

    @Pattern(regexp = "USER|ADMIN", message = "role must be USER or ADMIN")
    private String role;

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
