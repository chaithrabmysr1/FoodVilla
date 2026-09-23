package com.example.foodVilla.notification_service.security;

public record AuthenticatedUser(Long userId, String email, String role) {
}
