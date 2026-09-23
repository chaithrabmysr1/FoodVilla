package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.event.RestaurantEvent;
import com.example.foodVilla.order_service.exception.InvalidOrderStatusTransitionException;
import com.example.foodVilla.order_service.messaging.RestaurantEventConsumer;
import com.example.foodVilla.order_service.service.OrderService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Proves order-service tolerates a redelivered/duplicate Kafka message
 * (at-least-once delivery is the norm) without crashing or applying the
 * transition twice — see the Phase 3 plan's "duplicate event handling"
 * requirement. The real dedup mechanism is OrderStatusTransitionValidator
 * itself: a second ACCEPTED event arrives once the order is already past
 * RESTAURANT_PENDING, so the second updateStatus() call throws, and the
 * consumer must swallow that as a no-op rather than propagate it.
 */
class RestaurantEventConsumerTest {

    @Test
    void acceptedEventTriggersRestaurantAcceptedTransition() {
        OrderService orderService = mock(OrderService.class);
        RestaurantEventConsumer consumer = new RestaurantEventConsumer(orderService);

        RestaurantEvent event = new RestaurantEvent();
        event.setOrderId(42L);
        event.setType(RestaurantEvent.Type.ACCEPTED);

        consumer.onRestaurantEvent(event);

        verify(orderService, times(1))
                .updateStatus(eq(42L), eq(OrderStatus.RESTAURANT_ACCEPTED), any());
    }

    @Test
    void duplicateAcceptedEventIsIgnoredNotThrown() {
        OrderService orderService = mock(OrderService.class);
        RestaurantEventConsumer consumer = new RestaurantEventConsumer(orderService);

        RestaurantEvent event = new RestaurantEvent();
        event.setOrderId(42L);
        event.setType(RestaurantEvent.Type.ACCEPTED);

        // First delivery: order was RESTAURANT_PENDING, transition succeeds.
        consumer.onRestaurantEvent(event);

        // Second (redelivered) copy of the exact same message: the order has
        // moved on, so the same transition is now invalid — this must NOT
        // propagate out of the consumer (which would trigger Spring Kafka's
        // retry/error handling for something that isn't actually an error).
        when(orderService.updateStatus(eq(42L), eq(OrderStatus.RESTAURANT_ACCEPTED), any()))
                .thenThrow(new InvalidOrderStatusTransitionException(
                        "Cannot transition order from RESTAURANT_ACCEPTED to RESTAURANT_ACCEPTED"));

        assertThatCode(() -> consumer.onRestaurantEvent(event)).doesNotThrowAnyException();

        verify(orderService, times(2))
                .updateStatus(eq(42L), eq(OrderStatus.RESTAURANT_ACCEPTED), any());
    }

    @Test
    void rejectedEventMapsToCancelled() {
        OrderService orderService = mock(OrderService.class);
        RestaurantEventConsumer consumer = new RestaurantEventConsumer(orderService);

        RestaurantEvent event = new RestaurantEvent();
        event.setOrderId(7L);
        event.setType(RestaurantEvent.Type.REJECTED);
        event.setReason("Out of stock");

        consumer.onRestaurantEvent(event);

        verify(orderService).updateStatus(eq(7L), eq(OrderStatus.CANCELLED), any());
    }
}
