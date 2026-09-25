package com.example.foodVilla.order_service.controller;

import com.example.foodVilla.order_service.dto.CreatePaymentRequest;
import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.PaymentConfigResponse;
import com.example.foodVilla.order_service.dto.PaymentFailureRequest;
import com.example.foodVilla.order_service.dto.PaymentSessionResponse;
import com.example.foodVilla.order_service.dto.VerifyPaymentRequest;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import com.example.foodVilla.order_service.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Razorpay TEST MODE payment endpoints. Every route requires a valid JWT (the
 * default in SecurityConfig); ownership — the order's owner or an ADMIN — is
 * checked per order in PaymentService.
 */
@RestController
@RequestMapping("/api/orders")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /** Whether paying is possible at all (are test keys configured?). */
    @GetMapping("/payment/config")
    public ResponseEntity<PaymentConfigResponse> config() {
        return ResponseEntity.ok(paymentService.getConfig());
    }

    @PostMapping("/{orderId}/payment/create")
    public ResponseEntity<PaymentSessionResponse> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPayment(
                orderId, principal, request == null ? null : request.amount()));
    }

    @PostMapping("/{orderId}/payment/verify")
    public ResponseEntity<OrderResponse> verify(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long orderId,
            @Valid @RequestBody VerifyPaymentRequest request) {
        return ResponseEntity.ok(paymentService.verifyPayment(orderId, principal, request));
    }

    /** Records a failed attempt reported by Razorpay Checkout (never marks anything paid). */
    @PostMapping("/{orderId}/payment/failure")
    public ResponseEntity<OrderResponse> failure(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long orderId,
            @Valid @RequestBody PaymentFailureRequest request) {
        return ResponseEntity.ok(paymentService.reportFailure(orderId, principal, request));
    }

    /** Recovery: asks Razorpay whether a payment actually went through, then updates the order. */
    @PostMapping("/{orderId}/payment/sync")
    public ResponseEntity<OrderResponse> sync(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(paymentService.syncPayment(orderId, principal));
    }
}
