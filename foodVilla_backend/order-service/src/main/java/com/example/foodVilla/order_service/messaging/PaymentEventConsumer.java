package com.example.foodVilla.order_service.messaging;

import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.event.PaymentEvent;
import com.example.foodVilla.order_service.exception.InvalidOrderStatusTransitionException;
import com.example.foodVilla.order_service.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventConsumer.class);

    private final OrderService orderService;

    public PaymentEventConsumer(OrderService orderService) {
        this.orderService = orderService;
    }

    @KafkaListener(topics = "${kafka.topic.payment-events}")
    public void onPaymentEvent(PaymentEvent event) {
        try {
            switch (event.getType()) {
                case INITIATED -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.PAYMENT_PENDING, "Payment initiated");
                case SUCCESS -> {
                    orderService.updateStatus(event.getOrderId(), OrderStatus.PAYMENT_CONFIRMED,
                            "Payment confirmed (paymentId=" + event.getPaymentId() + ")");
                    // Payment confirmation automatically routes the order to the
                    // restaurant's queue — this isn't a distinct restaurant action.
                    orderService.updateStatus(event.getOrderId(), OrderStatus.RESTAURANT_PENDING,
                            "Order sent to restaurant");
                }
                case FAILED -> orderService.updateStatus(
                        event.getOrderId(), OrderStatus.PAYMENT_FAILED, event.getReason());
            }
        } catch (InvalidOrderStatusTransitionException ex) {
            // The order has already moved past (or was never at) the state this
            // event expects — most likely a redelivered/duplicate message.
            // Treat as an idempotent no-op rather than an error.
            log.info("Ignoring PaymentEvent {} for order {}: {}",
                    event.getType(), event.getOrderId(), ex.getMessage());
        }
    }
}
