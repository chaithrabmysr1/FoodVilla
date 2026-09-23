package com.example.foodVilla.notification_service.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Registered by the mobile app (Phase 8) so Kafka-driven order events can
 * later be forwarded as push notifications. Storage only for now — no push
 * provider (Expo/FCM) is wired up to actually send anything yet; see
 * NotificationService's javadoc.
 */
@Entity
@Table(name = "device_tokens", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "device_token"}))
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_token", nullable = false, length = 512)
    private String deviceToken;

    @Column(nullable = false)
    private String platform;

    @Column(name = "registered_at", nullable = false, updatable = false)
    private LocalDateTime registeredAt;

    @PrePersist
    protected void onCreate() {
        registeredAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getDeviceToken() { return deviceToken; }
    public void setDeviceToken(String deviceToken) { this.deviceToken = deviceToken; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
