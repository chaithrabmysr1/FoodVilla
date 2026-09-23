package com.example.foodVilla.notification_service.messaging;

import com.example.foodVilla.notification_service.event.OrderStatusChangedEvent;
import com.example.foodVilla.notification_service.service.NotificationService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderEventConsumer {

    private final NotificationService notificationService;

    public OrderEventConsumer(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @KafkaListener(topics = "${kafka.topic.order-events}")
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        notificationService.handleOrderStatusChanged(event);
    }
}
