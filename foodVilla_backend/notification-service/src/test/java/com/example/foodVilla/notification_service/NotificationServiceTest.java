package com.example.foodVilla.notification_service;

import com.example.foodVilla.notification_service.entity.Notification;
import com.example.foodVilla.notification_service.event.OrderStatusChangedEvent;
import com.example.foodVilla.notification_service.repository.NotificationRepository;
import com.example.foodVilla.notification_service.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        notificationService = new NotificationService();
        ReflectionTestUtils.setField(notificationService, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(notificationService, "deviceTokenRepository", mock(
                com.example.foodVilla.notification_service.repository.DeviceTokenRepository.class));
    }

    private OrderStatusChangedEvent event(Long userId, String newStatus) {
        OrderStatusChangedEvent event = new OrderStatusChangedEvent();
        event.setOrderId(10L);
        event.setUserId(userId);
        event.setNewStatus(newStatus);
        return event;
    }

    @Test
    void deliveredStatusCreatesANotification() {
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        notificationService.handleOrderStatusChanged(event(1L, "DELIVERED"));

        verify(notificationRepository).save(any());
    }

    @Test
    void transientInternalStatusDoesNotCreateANotification() {
        notificationService.handleOrderStatusChanged(event(1L, "PAYMENT_PENDING"));
        notificationService.handleOrderStatusChanged(event(1L, "RESTAURANT_PENDING"));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void deliveredNotificationHasCustomerFriendlyCopy() {
        var captor = org.mockito.ArgumentCaptor.forClass(Notification.class);
        when(notificationRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        notificationService.handleOrderStatusChanged(event(1L, "DELIVERED"));

        Notification saved = captor.getValue();
        assertThat(saved.getTitle()).isEqualTo("Delivered");
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getOrderId()).isEqualTo(10L);
        assertThat(saved.isRead()).isFalse();
    }
}
