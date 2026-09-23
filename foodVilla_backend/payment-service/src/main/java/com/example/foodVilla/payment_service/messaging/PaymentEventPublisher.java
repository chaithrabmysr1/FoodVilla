package com.example.foodVilla.payment_service.messaging;

import com.example.foodVilla.payment_service.event.PaymentEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topic.payment-events}")
    private String paymentEventsTopic;

    public PaymentEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(PaymentEvent event) {
        // Keyed by orderId — same ordering rationale as order-service's
        // OrderEventPublisher (order-service is the consumer here).
        kafkaTemplate.send(paymentEventsTopic, String.valueOf(event.getOrderId()), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish PaymentEvent {} for order {}: {}",
                                event.getType(), event.getOrderId(), ex.getMessage(), ex);
                    }
                });
    }
}
