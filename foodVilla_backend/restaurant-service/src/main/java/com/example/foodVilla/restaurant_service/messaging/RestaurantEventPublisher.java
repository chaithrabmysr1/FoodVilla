package com.example.foodVilla.restaurant_service.messaging;

import com.example.foodVilla.restaurant_service.event.RestaurantEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class RestaurantEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RestaurantEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topic.restaurant-events}")
    private String restaurantEventsTopic;

    public RestaurantEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(RestaurantEvent event) {
        kafkaTemplate.send(restaurantEventsTopic, String.valueOf(event.getOrderId()), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish RestaurantEvent {} for order {}: {}",
                                event.getType(), event.getOrderId(), ex.getMessage(), ex);
                    }
                });
    }
}
