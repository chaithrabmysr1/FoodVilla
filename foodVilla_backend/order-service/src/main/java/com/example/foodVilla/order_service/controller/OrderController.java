package com.example.foodVilla.order_service.controller;

import com.example.foodVilla.order_service.dto.CancelOrderRequest;
import com.example.foodVilla.order_service.dto.CreateOrderRequest;
import com.example.foodVilla.order_service.dto.OrderQuoteRequest;
import com.example.foodVilla.order_service.dto.OrderQuoteResponse;
import com.example.foodVilla.order_service.dto.OrderResponse;
import com.example.foodVilla.order_service.dto.OrderStatusUpdateRequest;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import com.example.foodVilla.order_service.service.OrderCreationResult;
import com.example.foodVilla.order_service.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateOrderRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey) {

        OrderCreationResult result = orderService.createOrder(principal, request, idempotencyKey);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(orderService.toResponse(result.order()));
    }

    // Prices a cart (delivery fee, tax, total) without creating anything, so
    // checkout can show the real bill before "Proceed to Payment".
    @PostMapping("/quote")
    public ResponseEntity<OrderQuoteResponse> quote(@Valid @RequestBody OrderQuoteRequest request) {
        return ResponseEntity.ok(orderService.quote(request));
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> listMyOrders(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(orderService.listMyOrders(principal, pageable));
    }

    @GetMapping("/restaurant/{restaurantId}")
    public ResponseEntity<Page<OrderResponse>> listOrdersForRestaurant(
            @PathVariable Long restaurantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(orderService.listOrdersForRestaurant(restaurantId, pageable));
    }

    @GetMapping("/admin")
    public ResponseEntity<Page<OrderResponse>> listAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(orderService.listAllOrders(status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrder(id, principal));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id,
            @RequestBody(required = false) CancelOrderRequest request) {

        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(orderService.cancelOrder(id, principal, reason));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateStatus(id, request.getStatus(), request.getNote()));
    }
}
