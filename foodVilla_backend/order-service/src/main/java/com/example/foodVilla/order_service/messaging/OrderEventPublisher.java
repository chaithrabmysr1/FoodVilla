package com.example.foodVilla.order_service.messaging;

import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topic.order-events}")
    private String orderEventsTopic;

    public OrderEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishStatusChanged(Order order, OrderStatus previousStatus, String note) {
        OrderStatusChangedEvent event = new OrderStatusChangedEvent(
                order.getId(), order.getUserId(), order.getRestaurantId(),
                previousStatus, order.getOrderStatus(), note);

        // Keyed by orderId so every event for one order lands on the same
        // partition and is delivered to consumers in order.
        kafkaTemplate.send(orderEventsTopic, String.valueOf(order.getId()), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish OrderStatusChangedEvent for order {}: {}",
                                order.getId(), ex.getMessage(), ex);
                    }
                });
    }
}
