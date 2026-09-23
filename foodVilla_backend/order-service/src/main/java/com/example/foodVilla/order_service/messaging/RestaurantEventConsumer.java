package com.example.foodVilla.order_service.messaging;

import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.event.RestaurantEvent;
import com.example.foodVilla.order_service.exception.InvalidOrderStatusTransitionException;
import com.example.foodVilla.order_service.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class RestaurantEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(RestaurantEventConsumer.class);

    private final OrderService orderService;

    public RestaurantEventConsumer(OrderService orderService) {
        this.orderService = orderService;
    }

    @KafkaListener(topics = "${kafka.topic.restaurant-events}")
    public void onRestaurantEvent(RestaurantEvent event) {
        try {
            switch (event.getType()) {
                case ACCEPTED -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.RESTAURANT_ACCEPTED, "Accepted by restaurant");
                case REJECTED -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.CANCELLED,
                        "Rejected by restaurant" + (event.getReason() != null ? ": " + event.getReason() : ""));
                case PREPARING -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.PREPARING, "Preparation started");
                case READY -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.READY_FOR_PICKUP, "Food ready for pickup");
            }
        } catch (InvalidOrderStatusTransitionException ex) {
            log.info("Ignoring RestaurantEvent {} for order {}: {}",
                    event.getType(), event.getOrderId(), ex.getMessage());
        }
    }
}
