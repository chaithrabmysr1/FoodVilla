package com.example.foodVilla.payment_service.security;

public record AuthenticatedUser(Long userId, String email, String role) {
}
