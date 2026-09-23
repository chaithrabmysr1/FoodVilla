package com.example.foodVilla.notification_service.controller;

import com.example.foodVilla.notification_service.dto.DeviceTokenRequest;
import com.example.foodVilla.notification_service.dto.NotificationResponse;
import com.example.foodVilla.notification_service.security.AuthenticatedUser;
import com.example.foodVilla.notification_service.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "${cors.allowed.origin}")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(notificationService.listForUser(principal.userId(), pageable));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markRead(id, principal.userId()));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal AuthenticatedUser principal) {
        notificationService.markAllRead(principal.userId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/devices")
    public ResponseEntity<Void> registerDevice(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody DeviceTokenRequest request) {
        notificationService.registerDevice(principal.userId(), request);
        return ResponseEntity.noContent().build();
    }

    // Browser EventSource connects here (auth via ?token=<jwt>, see JwtFilter).
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal AuthenticatedUser principal) {
        return notificationService.subscribe(principal.userId());
    }
}
