package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.exception.InvalidOrderStatusTransitionException;
import com.example.foodVilla.order_service.service.OrderStatusTransitionValidator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrderStatusTransitionValidatorTest {

    private final OrderStatusTransitionValidator validator = new OrderStatusTransitionValidator();

    @Test
    void fullHappyPathChainSucceeds() {
        OrderStatus[] chain = {
                OrderStatus.CREATED,
                OrderStatus.PAYMENT_PENDING,
                OrderStatus.PAYMENT_CONFIRMED,
                OrderStatus.RESTAURANT_PENDING,
                OrderStatus.RESTAURANT_ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.DELIVERY_PARTNER_ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.DELIVERED
        };
        for (int i = 0; i < chain.length - 1; i++) {
            OrderStatus from = chain[i];
            OrderStatus to = chain[i + 1];
            assertDoesNotThrow(() -> validator.validateTransition(from, to),
                    () -> "Expected " + from + " -> " + to + " to be legal");
        }
    }

    @Test
    void skipAheadTransitionIsRejected() {
        assertThrows(InvalidOrderStatusTransitionException.class,
                () -> validator.validateTransition(OrderStatus.CREATED, OrderStatus.PREPARING));
    }

    @Test
    void cancelSucceedsFromRestaurantAccepted() {
        assertDoesNotThrow(() -> validator.validateCancellable(OrderStatus.RESTAURANT_ACCEPTED));
    }

    @Test
    void cancelIsRejectedOncePreparing() {
        assertThrows(InvalidOrderStatusTransitionException.class,
                () -> validator.validateCancellable(OrderStatus.PREPARING));
    }

    @Test
    void terminalStatesRejectAnyFurtherTransition() {
        for (OrderStatus terminal : new OrderStatus[]{OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.PAYMENT_FAILED}) {
            assertThrows(InvalidOrderStatusTransitionException.class,
                    () -> validator.validateTransition(terminal, OrderStatus.CREATED));
            assertThrows(InvalidOrderStatusTransitionException.class,
                    () -> validator.validateTransition(terminal, OrderStatus.CANCELLED));
        }
    }

    @Test
    void paymentFailedOnlyReachableFromCreatedOrPaymentPending() {
        assertDoesNotThrow(() -> validator.validateTransition(OrderStatus.CREATED, OrderStatus.PAYMENT_FAILED));
        assertDoesNotThrow(() -> validator.validateTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_FAILED));
        assertThrows(InvalidOrderStatusTransitionException.class,
                () -> validator.validateTransition(OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PAYMENT_FAILED));
    }
}
