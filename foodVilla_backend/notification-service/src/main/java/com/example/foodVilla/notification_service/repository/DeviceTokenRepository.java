package com.example.foodVilla.notification_service.repository;

import com.example.foodVilla.notification_service.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    List<DeviceToken> findByUserId(Long userId);
    Optional<DeviceToken> findByUserIdAndDeviceToken(Long userId, String deviceToken);
}
