package com.example.foodVilla.delivery_service.messaging;

import com.example.foodVilla.delivery_service.event.DeliveryEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class DeliveryEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DeliveryEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topic.delivery-events}")
    private String deliveryEventsTopic;

    public DeliveryEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(DeliveryEvent event) {
        kafkaTemplate.send(deliveryEventsTopic, String.valueOf(event.getOrderId()), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish DeliveryEvent {} for order {}: {}",
                                event.getType(), event.getOrderId(), ex.getMessage(), ex);
                    }
                });
    }
}
