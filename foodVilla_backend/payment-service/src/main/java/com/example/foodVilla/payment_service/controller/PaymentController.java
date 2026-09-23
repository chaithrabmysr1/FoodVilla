package com.example.foodVilla.payment_service.controller;

import com.example.foodVilla.payment_service.dto.FailPaymentRequest;
import com.example.foodVilla.payment_service.dto.InitiatePaymentRequest;
import com.example.foodVilla.payment_service.dto.PaymentResponse;
import com.example.foodVilla.payment_service.security.AuthenticatedUser;
import com.example.foodVilla.payment_service.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponse> initiate(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody InitiatePaymentRequest request,
            @RequestHeader("Authorization") String authHeader) {
        PaymentResponse response = paymentService.initiatePayment(principal, request.getOrderId(), authHeader);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<PaymentResponse> confirm(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(paymentService.confirmMockPayment(id, principal));
    }

    @PostMapping("/{id}/fail")
    public ResponseEntity<PaymentResponse> fail(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id,
            @RequestBody(required = false) FailPaymentRequest request) {
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(paymentService.failMockPayment(id, principal, reason));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<PaymentResponse>> getForOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(paymentService.getPaymentsForOrder(orderId, principal));
    }

    // Called by Razorpay's servers directly — no JWT. Protected instead by
    // HMAC signature verification against the raw body inside the service.
    @PostMapping("/razorpay/webhook")
    public ResponseEntity<Void> razorpayWebhook(
            @RequestBody String rawPayload,
            @RequestHeader("X-Razorpay-Signature") String signature) {
        paymentService.handleRazorpayWebhook(rawPayload, signature);
        return ResponseEntity.ok().build();
    }
}
