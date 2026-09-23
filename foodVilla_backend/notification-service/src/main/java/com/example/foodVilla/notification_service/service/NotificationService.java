package com.example.foodVilla.notification_service.service;

import com.example.foodVilla.notification_service.dto.DeviceTokenRequest;
import com.example.foodVilla.notification_service.dto.NotificationResponse;
import com.example.foodVilla.notification_service.entity.DeviceToken;
import com.example.foodVilla.notification_service.entity.Notification;
import com.example.foodVilla.notification_service.event.OrderStatusChangedEvent;
import com.example.foodVilla.notification_service.exception.AccessDeniedException;
import com.example.foodVilla.notification_service.exception.ResourceNotFoundException;
import com.example.foodVilla.notification_service.repository.DeviceTokenRepository;
import com.example.foodVilla.notification_service.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Consumes order.events (see OrderEventConsumer) to create in-app
 * notifications, and fans each new one out over SSE to any browser tabs
 * currently subscribed for that user (see /api/notifications/stream) — the
 * Phase 7/13 "no manual refresh" mechanism.
 *
 * Mobile push (Expo/FCM) is NOT wired up — registerDevice() only persists
 * the token so Phase 8's mobile app has somewhere to register itself; no
 * push provider credentials or send-call exist yet (see CONFIGURATION.md).
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    // newStatus -> {title, message}. Deliberately excludes transient/internal
    // statuses (PAYMENT_PENDING, RESTAURANT_PENDING) that aren't worth
    // interrupting the customer for.
    private static final Map<String, String[]> STATUS_MESSAGES = Map.ofEntries(
            Map.entry("CREATED", new String[]{"Order placed", "We've received your order."}),
            Map.entry("PAYMENT_CONFIRMED", new String[]{"Payment successful", "Your payment was confirmed."}),
            Map.entry("RESTAURANT_ACCEPTED", new String[]{"Order accepted", "The restaurant has accepted your order."}),
            Map.entry("PREPARING", new String[]{"Preparing your food", "The restaurant has started preparing your order."}),
            Map.entry("READY_FOR_PICKUP", new String[]{"Food ready", "Your food is ready for pickup."}),
            Map.entry("DELIVERY_PARTNER_ASSIGNED", new String[]{"Delivery partner assigned", "A delivery partner has been assigned to your order."}),
            Map.entry("PICKED_UP", new String[]{"Order picked up", "Your order has been picked up."}),
            Map.entry("OUT_FOR_DELIVERY", new String[]{"Out for delivery", "Your order is on its way."}),
            Map.entry("DELIVERED", new String[]{"Delivered", "Your order has been delivered. Enjoy your meal!"}),
            Map.entry("CANCELLED", new String[]{"Order cancelled", "Your order has been cancelled."}),
            Map.entry("PAYMENT_FAILED", new String[]{"Payment failed", "We couldn't process payment for your order."})
    );

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private DeviceTokenRepository deviceTokenRepository;

    private final Map<Long, List<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        String[] copy = STATUS_MESSAGES.get(event.getNewStatus());
        if (copy == null || event.getUserId() == null) {
            return; // Not a customer-facing status change — nothing to notify.
        }

        Notification notification = new Notification();
        notification.setUserId(event.getUserId());
        notification.setType(event.getNewStatus());
        notification.setTitle(copy[0]);
        notification.setMessage(copy[1]);
        notification.setOrderId(event.getOrderId());
        notification.setRead(false);

        Notification saved = notificationRepository.save(notification);
        pushToSse(saved);
    }

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout — closed on disconnect/error only
        emittersByUser.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>()).add(emitter);

        Runnable cleanup = () -> {
            List<SseEmitter> list = emittersByUser.get(userId);
            if (list != null) list.remove(emitter);
        };
        emitter.onCompletion(cleanup::run);
        emitter.onTimeout(cleanup::run);
        emitter.onError(ex -> cleanup.run());

        return emitter;
    }

    private void pushToSse(Notification notification) {
        List<SseEmitter> emitters = emittersByUser.get(notification.getUserId());
        if (emitters == null || emitters.isEmpty()) return;

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(toResponse(notification)));
            } catch (Exception ex) {
                log.debug("Dropping stale SSE connection for user {}: {}", notification.getUserId(), ex.getMessage());
                emitters.remove(emitter);
            }
        }
    }

    public Page<NotificationResponse> listForUser(Long userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable).map(this::toResponse);
    }

    public NotificationResponse markRead(Long id, Long userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + id));
        if (!notification.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have access to this notification");
        }
        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    public void markAllRead(Long userId) {
        Pageable all = org.springframework.data.domain.PageRequest.of(0, 500);
        notificationRepository.findByUserId(userId, all).forEach(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    public void registerDevice(Long userId, DeviceTokenRequest request) {
        Optional<DeviceToken> existing = deviceTokenRepository.findByUserIdAndDeviceToken(userId, request.getDeviceToken());
        if (existing.isPresent()) {
            return; // already registered
        }
        DeviceToken token = new DeviceToken();
        token.setUserId(userId);
        token.setDeviceToken(request.getDeviceToken());
        token.setPlatform(request.getPlatform());
        deviceTokenRepository.save(token);
    }

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setType(notification.getType());
        response.setTitle(notification.getTitle());
        response.setMessage(notification.getMessage());
        response.setOrderId(notification.getOrderId());
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }
}
