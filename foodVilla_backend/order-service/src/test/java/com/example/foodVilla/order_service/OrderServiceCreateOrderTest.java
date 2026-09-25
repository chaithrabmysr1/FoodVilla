package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.dto.CatalogueFoodItemDTO;
import com.example.foodVilla.order_service.dto.CatalogueResponseDTO;
import com.example.foodVilla.order_service.dto.CreateOrderRequest;
import com.example.foodVilla.order_service.dto.DeliveryAddressRequest;
import com.example.foodVilla.order_service.dto.OrderItemRequest;
import com.example.foodVilla.order_service.dto.OrderQuoteRequest;
import com.example.foodVilla.order_service.dto.OrderQuoteResponse;
import com.example.foodVilla.order_service.dto.RestaurantDTO;
import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import com.example.foodVilla.order_service.exception.ResourceNotFoundException;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import com.example.foodVilla.order_service.repository.OrderRepository;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import com.example.foodVilla.order_service.service.OrderCreationResult;
import com.example.foodVilla.order_service.service.OrderService;
import com.example.foodVilla.order_service.service.OrderStatusTransitionValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Placing an order only creates it. It is NOT handed to the restaurant until a
 * Razorpay payment has been verified (see PaymentServiceTest), so a new order
 * stays CREATED with payment PENDING. The bill shown at checkout comes from the
 * same pricing code, via quote().
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceCreateOrderTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private OrderEventPublisher eventPublisher;

    @Spy
    private OrderStatusTransitionValidator transitionValidator = new OrderStatusTransitionValidator();

    @InjectMocks
    private OrderService orderService;

    @BeforeEach
    void configureValues() {
        ReflectionTestUtils.setField(orderService, "catalogueServiceUrl", "http://catalogue/api/catalogue/");
        ReflectionTestUtils.setField(orderService, "deliveryFeeConfig", new BigDecimal("40"));
        ReflectionTestUtils.setField(orderService, "taxRateConfig", new BigDecimal("0.05"));
    }

    @Test
    void newOrderWaitsForPaymentInsteadOfGoingToTheRestaurant() {
        AuthenticatedUser user = new AuthenticatedUser(7L, "diner@example.com", "USER");
        when(orderRepository.findByUserIdAndIdempotencyKey(7L, "key-1")).thenReturn(Optional.empty());
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(99L);
            return order;
        });

        OrderCreationResult result = orderService.createOrder(user, request(), "key-1");

        Order order = result.order();
        assertThat(result.created()).isTrue();
        // Not sent to the restaurant: that happens only once payment is verified.
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(order.getStatusHistory())
                .extracting(h -> h.getStatus())
                .containsExactly(OrderStatus.CREATED);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getPaymentId()).isNull();
        assertThat(order.getRazorpayOrderId()).isNull();
        // 2 x 100 = 200 subtotal, + 40 delivery fee + 10 tax, computed server-side.
        assertThat(order.getSubtotalAmount()).isEqualByComparingTo("200");
        assertThat(order.getDeliveryFee()).isEqualByComparingTo("40.00");
        assertThat(order.getTaxAmount()).isEqualByComparingTo("10.00");
        assertThat(order.getDiscountAmount()).isEqualByComparingTo("0");
        assertThat(order.getFinalAmount()).isEqualByComparingTo("250.00");

        verify(eventPublisher, times(1)).publishStatusChanged(
                any(Order.class), eq(null), anyString());
    }

    @Test
    void quoteMatchesWhatCreateOrderWillCharge() {
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());

        OrderItemRequest item = new OrderItemRequest();
        item.setFoodItemId(11L);
        item.setQuantity(2);

        OrderQuoteResponse quote = orderService.quote(new OrderQuoteRequest(5L, List.of(item)));

        assertThat(quote.subtotalAmount()).isEqualByComparingTo("200");
        assertThat(quote.deliveryFee()).isEqualByComparingTo("40.00");
        assertThat(quote.taxAmount()).isEqualByComparingTo("10.00");
        assertThat(quote.discountAmount()).isEqualByComparingTo("0");
        assertThat(quote.finalAmount()).isEqualByComparingTo("250.00");
        assertThat(quote.currency()).isEqualTo("INR");
        assertThat(quote.items()).hasSize(1);
        assertThat(quote.items().get(0).getItemName()).isEqualTo("Paneer Tikka");
        assertThat(quote.items().get(0).getSubtotal()).isEqualByComparingTo("200");
        // A quote prices a cart; it must not create anything.
        verify(orderRepository, never()).save(any(Order.class));
        verify(eventPublisher, never()).publishStatusChanged(any(), any(), anyString());
    }

    @Test
    void quoteRejectsAnItemThatBelongsToAnotherRestaurant() {
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());

        OrderItemRequest item = new OrderItemRequest();
        item.setFoodItemId(11L);
        item.setQuantity(1);

        assertThatThrownBy(() -> orderService.quote(new OrderQuoteRequest(6L, List.of(item))))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private CatalogueResponseDTO catalogue() {
        RestaurantDTO restaurant = new RestaurantDTO();
        restaurant.setId(5L);
        restaurant.setName("Test Kitchen");

        CatalogueFoodItemDTO item = new CatalogueFoodItemDTO();
        item.setId(11L);
        item.setItemName("Paneer Tikka");
        item.setPrice(100L);
        item.setRestaurantId(5L);

        CatalogueResponseDTO response = new CatalogueResponseDTO();
        response.setRestaurant(restaurant);
        response.setFoodItems(List.of(item));
        return response;
    }

    private CreateOrderRequest request() {
        OrderItemRequest item = new OrderItemRequest();
        item.setFoodItemId(11L);
        item.setQuantity(2);

        DeliveryAddressRequest address = new DeliveryAddressRequest();
        address.setRecipientName("A Diner");
        address.setPhone("9999999999");
        address.setAddressLine1("1 Main St");
        address.setCity("Mysuru");
        address.setState("Karnataka");
        address.setPincode("570001");

        CreateOrderRequest request = new CreateOrderRequest();
        request.setRestaurantId(5L);
        request.setItems(List.of(item));
        request.setDeliveryAddress(address);
        return request;
    }
}
