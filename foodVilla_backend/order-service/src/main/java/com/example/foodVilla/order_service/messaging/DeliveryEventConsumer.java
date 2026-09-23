package com.example.foodVilla.order_service.messaging;

import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.event.DeliveryEvent;
import com.example.foodVilla.order_service.exception.InvalidOrderStatusTransitionException;
import com.example.foodVilla.order_service.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class DeliveryEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(DeliveryEventConsumer.class);

    private final OrderService orderService;

    public DeliveryEventConsumer(OrderService orderService) {
        this.orderService = orderService;
    }

    @KafkaListener(topics = "${kafka.topic.delivery-events}")
    public void onDeliveryEvent(DeliveryEvent event) {
        try {
            switch (event.getType()) {
                case ASSIGNED -> {
                    orderService.assignDeliveryPartner(event.getOrderId(), event.getDeliveryPartnerId());
                    orderService.updateStatus(event.getOrderId(), OrderStatus.DELIVERY_PARTNER_ASSIGNED,
                            "Delivery partner assigned");
                }
                case PICKED_UP -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.PICKED_UP, "Order picked up");
                case OUT_FOR_DELIVERY -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.OUT_FOR_DELIVERY, "Out for delivery");
                case DELIVERED -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.DELIVERED, "Delivered");
            }
        } catch (InvalidOrderStatusTransitionException ex) {
            log.info("Ignoring DeliveryEvent {} for order {}: {}",
                    event.getType(), event.getOrderId(), ex.getMessage());
        }
    }
}
