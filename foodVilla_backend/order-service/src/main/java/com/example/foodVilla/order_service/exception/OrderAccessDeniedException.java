package com.example.foodVilla.order_service.exception;

/**
 * Thrown when an authenticated user tries to read or act on an order they
 * don't own (and aren't ADMIN). Ownership can't be expressed as a Spring
 * Security path rule since it depends on the resource, not just the route.
 */
public class OrderAccessDeniedException extends RuntimeException {
    public OrderAccessDeniedException(String message) {
        super(message);
    }
}
