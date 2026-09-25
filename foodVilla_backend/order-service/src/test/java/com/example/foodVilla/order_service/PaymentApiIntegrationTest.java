package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.dto.CatalogueFoodItemDTO;
import com.example.foodVilla.order_service.dto.CatalogueResponseDTO;
import com.example.foodVilla.order_service.dto.RestaurantDTO;
import com.example.foodVilla.order_service.entity.Order;
import com.example.foodVilla.order_service.entity.OrderItem;
import com.example.foodVilla.order_service.entity.OrderStatus;
import com.example.foodVilla.order_service.entity.OrderStatusHistory;
import com.example.foodVilla.order_service.entity.PaymentStatus;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import com.example.foodVilla.order_service.repository.OrderRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end over HTTP with the real controller, Spring Security (JWT), JPA and
 * row locking — against in-memory H2, with no Kafka broker. Payments are
 * simulated, so nothing external needs stubbing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("payment-it")
class PaymentApiIntegrationTest {

    private static final String JWT_SECRET = "payment-integration-test-signing-key-0123456789abcdef";

    @Autowired private MockMvc mvc;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ObjectMapper json;

    @MockitoBean private OrderEventPublisher eventPublisher;
    @MockitoBean private RestTemplate restTemplate;

    private final String owner = token(7L, "diner@example.com", "USER");
    private final String otherUser = token(8L, "someone-else@example.com", "USER");
    private final String admin = token(1L, "admin@example.com", "ADMIN");

    @BeforeEach
    void cleanSlate() {
        orderRepository.deleteAll();
        reset(eventPublisher, restTemplate);
    }

    // ---- access control -------------------------------------------------

    @Test
    void payingRequiresLogin() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", null, payBody("UPI")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anotherUserGetsForbiddenAndChangesNothing() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", otherUser, payBody("UPI")))
                .andExpect(status().isForbidden());

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(reloaded.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(reloaded.getPaymentId()).isNull();
        assertThat(reloaded.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void anAdminMayPayOnBehalfOfACustomer() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", admin, payBody("UPI")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"));
    }

    @Test
    void theRemovedRazorpayEndpointsAreGone() throws Exception {
        Order order = savedOrder(7L);

        for (String path : new String[]{"create", "verify", "failure", "sync"}) {
            int status = mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/" + path, owner, "{}"))
                    .andReturn().getResponse().getStatus();
            assertThat(status).as(path).isNotEqualTo(200);
        }
        assertThat(orderRepository.findById(order.getId()).orElseThrow().getPaymentStatus())
                .isEqualTo(PaymentStatus.PENDING);
    }

    // ---- the flow --------------------------------------------------------

    @Test
    void placingAnOrderDoesNotSendItToTheRestaurantUntilItIsPaid() throws Exception {
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());

        MvcResult created = mvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + owner)
                        .header("Idempotency-Key", "checkout-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderStatus").value("CREATED"))
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.finalAmount").value(250.00))
                .andReturn();
        long orderId = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Same idempotency key again -> same order, not a second one.
        mvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + owner)
                        .header("Idempotency-Key", "checkout-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderId));
        assertThat(orderRepository.count()).isEqualTo(1);

        mvc.perform(jsonPost("/api/orders/" + orderId + "/payment/pay", owner,
                        "{\"method\":\"CARD\",\"detail\":\"Visa •••• 1111\",\"amount\":250}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderStatus").value("RESTAURANT_PENDING"))
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.paymentId").value(org.hamcrest.Matchers.matchesPattern("FVPAY[A-Z2-9]{12}")))
                .andExpect(jsonPath("$.paymentProvider").value("DEMO"))
                .andExpect(jsonPath("$.paymentMethod").value("CARD"))
                .andExpect(jsonPath("$.paymentDetail").value("Visa •••• 1111"))
                .andExpect(jsonPath("$.paidAt").exists());

        // The stored order matches what the API said.
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + owner))
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.orderStatus").value("RESTAURANT_PENDING"));
    }

    @Test
    void everySupportedMethodCanPay() throws Exception {
        for (String method : new String[]{"UPI", "CARD", "NETBANKING", "PAYTM", "PAYPAL"}) {
            Order order = savedOrder(7L);

            mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, payBody(method)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.paymentMethod").value(method))
                    .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"));
        }
    }

    @Test
    void anUnknownMethodIsRejectedWithAClearCode() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, payBody("BITCOIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAYMENT_METHOD"));
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));

        assertThat(orderRepository.findById(order.getId()).orElseThrow().getPaymentStatus())
                .isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void aTamperedClientAmountIsRefused() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner,
                        "{\"method\":\"UPI\",\"amount\":1}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AMOUNT_MISMATCH"));

        assertThat(orderRepository.findById(order.getId()).orElseThrow().getPaymentStatus())
                .isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void anAlreadyPaidOrderIsNotPaidTwice() throws Exception {
        Order order = savedOrder(7L);
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, payBody("UPI")))
                .andExpect(status().isOk());
        String receipt = orderRepository.findById(order.getId()).orElseThrow().getPaymentId();

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, payBody("CARD")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_ALREADY_PAID"));

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(reloaded.getPaymentId()).isEqualTo(receipt);
        assertThat(reloaded.getPaymentMethod()).isEqualTo("UPI");
        assertThat(historyStatuses(order.getId()))
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        verify(eventPublisher, times(1)).publishStatusChanged(any(Order.class), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void simultaneousPaymentsPayTheOrderExactlyOnce() throws Exception {
        Order order = savedOrder(7L);

        int callers = 6;
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        int ok = 0;
        int conflicts = 0;
        try {
            List<Callable<Integer>> calls = new ArrayList<>();
            for (int i = 0; i < callers; i++) {
                calls.add(() -> mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, payBody("UPI")))
                        .andReturn().getResponse().getStatus());
            }
            for (Future<Integer> result : pool.invokeAll(calls)) {
                int status = result.get();
                if (status == 200) {
                    ok++;
                } else if (status == 409) {
                    conflicts++;
                }
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(ok).isEqualTo(1);
        assertThat(conflicts).isEqualTo(callers - 1);
        assertThat(historyStatuses(order.getId()))
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        verify(eventPublisher, times(1)).publishStatusChanged(any(Order.class), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void aCancelledOrderCannotBePaid() throws Exception {
        Order order = savedOrder(7L);
        order.setOrderStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/pay", owner, payBody("UPI")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_PAYABLE"));
    }

    @Test
    void ordersPlacedBeforeOnlinePaymentsExistedStillLoadAndAreNotPayable() throws Exception {
        // Existing rows: no payment columns, already with the restaurant, payment_status PENDING.
        Order legacy = savedOrder(7L);
        legacy.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        orderRepository.save(legacy);

        mvc.perform(get("/api/orders/" + legacy.getId()).header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paymentExpired").value(false))
                .andExpect(jsonPath("$.paymentId").doesNotExist())
                .andExpect(jsonPath("$.paymentMethod").doesNotExist());
        mvc.perform(jsonPost("/api/orders/" + legacy.getId() + "/payment/pay", owner, payBody("UPI")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_PAYABLE"));
    }

    @Test
    void payingAnUnknownOrderIsNotFound() throws Exception {
        mvc.perform(jsonPost("/api/orders/999999/payment/pay", owner, payBody("UPI")))
                .andExpect(status().isNotFound());
    }

    // ---- quote -----------------------------------------------------------

    @Test
    void quotePricesACartWithoutCreatingAnything() throws Exception {
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());

        mvc.perform(jsonPost("/api/orders/quote", owner, "{\"restaurantId\":5,\"items\":[{\"foodItemId\":11,\"quantity\":2}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotalAmount").value(200))
                .andExpect(jsonPath("$.deliveryFee").value(40.00))
                .andExpect(jsonPath("$.taxAmount").value(10.00))
                .andExpect(jsonPath("$.discountAmount").value(0))
                .andExpect(jsonPath("$.finalAmount").value(250.00));
        assertThat(orderRepository.count()).isZero();
    }

    // ---- helpers ---------------------------------------------------------

    private MockHttpServletRequestBuilder jsonPost(String url, String bearer, String body) {
        MockHttpServletRequestBuilder request = post(url).contentType(MediaType.APPLICATION_JSON).content(body);
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        return request;
    }

    private static String payBody(String method) {
        return "{\"method\":\"" + method + "\"}";
    }

    private static String orderBody() {
        return """
                {"restaurantId":5,
                 "items":[{"foodItemId":11,"quantity":2}],
                 "deliveryAddress":{"recipientName":"A Diner","phone":"9999999999",
                   "addressLine1":"1 Main St","city":"Mysuru","state":"Karnataka","pincode":"570001"}}""";
    }

    // The lazily-loaded history is read the way a client sees it: over HTTP.
    private List<OrderStatus> historyStatuses(Long orderId) {
        try {
            MvcResult result = mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + owner))
                    .andExpect(status().isOk()).andReturn();
            List<OrderStatus> statuses = new ArrayList<>();
            for (JsonNode entry : json.readTree(result.getResponse().getContentAsString()).get("statusHistory")) {
                statuses.add(OrderStatus.valueOf(entry.get("status").asText()));
            }
            return statuses;
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private Order savedOrder(Long userId) {
        Order order = new Order();
        order.setUserId(userId);
        order.setCustomerEmail("user" + userId + "@example.com");
        order.setRestaurantId(5L);
        order.setRestaurantName("Test Kitchen");
        order.setSubtotalAmount(new BigDecimal("200.00"));
        order.setDeliveryFee(new BigDecimal("40.00"));
        order.setTaxAmount(new BigDecimal("10.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setFinalAmount(new BigDecimal("250.00"));
        order.setOrderStatus(OrderStatus.CREATED);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setIdempotencyKey("it-" + System.nanoTime());

        OrderItem item = new OrderItem();
        item.setFoodItemId(11L);
        item.setItemName("Paneer Tikka");
        item.setPrice(new BigDecimal("100"));
        item.setQuantity(2);
        item.setSubtotal(new BigDecimal("200"));
        order.addItem(item);
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.CREATED, "Order placed, awaiting payment"));
        return orderRepository.save(order);
    }

    private static CatalogueResponseDTO catalogue() {
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

    private static String token(Long userId, String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .claim("userId", userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3_600_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes()), SignatureAlgorithm.HS256)
                .compact();
    }
}
