package com.example.foodVilla.order_service.controller;

import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.PayOrderRequest;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import com.example.foodVilla.order_service.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Simulated payment endpoint (no real payment gateway, no real money). Requires
 * a valid JWT (the default in SecurityConfig); ownership — the order's owner or
 * an ADMIN — is checked per order in PaymentService.
 */
@RestController
@RequestMapping("/api/orders")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /** Pays the order with the chosen method and returns the confirmed order. */
    @PostMapping("/{orderId}/payment/pay")
    public ResponseEntity<OrderResponse> pay(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long orderId,
            @Valid @RequestBody PayOrderRequest request) {
        return ResponseEntity.ok(paymentService.payOrder(orderId, principal, request));
    }
}
