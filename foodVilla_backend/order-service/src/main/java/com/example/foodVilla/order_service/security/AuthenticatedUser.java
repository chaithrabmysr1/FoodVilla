package com.example.foodVilla.order_service.security;

/**
 * Principal placed in the SecurityContext once a JWT has been validated.
 * Carries the userId claim (used to enforce order-ownership checks) alongside
 * the email/role already present in every FoodVilla token.
 */
public record AuthenticatedUser(Long userId, String email, String role) {
}
