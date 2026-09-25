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
import com.example.foodVilla.order_service.payment.RazorpayGateway;
import com.example.foodVilla.order_service.payment.RazorpaySdkGateway;
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
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

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
 * row locking — against in-memory H2, with no Kafka broker and no Razorpay
 * network access. Only Razorpay's two network calls are stubbed; the payment
 * signature check is the real razorpay-java one.
 */
@SpringBootTest(properties = {
        "payment.razorpay.key-id=rzp_test_IntegrationKeyId",
        "payment.razorpay.key-secret=" + PaymentApiIntegrationTest.SECRET
})
@AutoConfigureMockMvc
@ActiveProfiles("payment-it")
class PaymentApiIntegrationTest {

    static final String SECRET = "integration-test-secret-not-real";
    private static final String JWT_SECRET = "payment-integration-test-signing-key-0123456789abcdef";

    /** Real signature verification, stubbed network. */
    @TestConfiguration
    static class StubbedRazorpay {
        static final AtomicInteger ORDERS_CREATED = new AtomicInteger();
        static volatile long lastAmountPaise;

        @Bean
        @Primary
        RazorpayGateway razorpayGateway() {
            return new RazorpaySdkGateway("rzp_test_IntegrationKeyId", SECRET) {
                @Override
                public RazorpayOrder createOrder(long amountPaise, String currency, String receipt, Map<String, String> notes) {
                    lastAmountPaise = amountPaise;
                    return new RazorpayOrder("order_IT" + ORDERS_CREATED.incrementAndGet(), amountPaise, currency);
                }

                @Override
                public List<RazorpayPayment> fetchPayments(String razorpayOrderId) {
                    return List.of();
                }
            };
        }
    }

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
    void everyPaymentEndpointRequiresLogin() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(get("/api/orders/payment/config")).andExpect(status().isUnauthorized());
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/create", null, "{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", null, verifyBody("o", "p", "s")))
                .andExpect(status().isUnauthorized());
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/failure", null, "{\"razorpayOrderId\":\"o\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/sync", null, ""))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anotherUserGetsForbiddenOnEveryPaymentEndpointAndChangesNothing() throws Exception {
        Order order = savedOrder(7L);
        String razorpayOrderId = startPayment(order, owner);
        String payment = "pay_Stolen1";

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/create", otherUser, "{}"))
                .andExpect(status().isForbidden());
        // Even a perfectly valid signature must not let a stranger settle someone else's order.
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", otherUser,
                        verifyBody(razorpayOrderId, payment, sign(razorpayOrderId, payment))))
                .andExpect(status().isForbidden());
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/failure", otherUser,
                        "{\"razorpayOrderId\":\"" + razorpayOrderId + "\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/sync", otherUser, ""))
                .andExpect(status().isForbidden());

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(reloaded.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(reloaded.getPaymentId()).isNull();
        assertThat(reloaded.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void anAdminMayPayOnBehalfOfACustomer() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/create", admin, "{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.razorpayOrderId").exists());
    }

    // ---- amount / secret -------------------------------------------------

    @Test
    void createChargesTheStoredAmountAndReturnsOnlyPublicValues() throws Exception {
        Order order = savedOrder(7L);

        MvcResult result = mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/create", owner, "{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(order.getId()))
                .andExpect(jsonPath("$.amount").value(25000))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.keyId").value("rzp_test_IntegrationKeyId"))
                .andExpect(jsonPath("$.razorpayOrderId").value(org.hamcrest.Matchers.startsWith("order_")))
                .andReturn();

        assertThat(StubbedRazorpay.lastAmountPaise).isEqualTo(25000L);
        // The response is the whole payload the browser gets — the secret must not be in it.
        assertThat(result.getResponse().getContentAsString()).doesNotContain(SECRET).doesNotContainIgnoringCase("secret");
    }

    @Test
    void aTamperedClientAmountIsRefused() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/create", owner, "{\"amount\": 1}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AMOUNT_MISMATCH"));

        assertThat(orderRepository.findById(order.getId()).orElseThrow().getRazorpayOrderId()).isNull();
    }

    @Test
    void aMatchingAmountIsAcceptedAndRepeatingCreateReturnsTheSameRazorpayOrder() throws Exception {
        Order order = savedOrder(7L);

        String first = startPayment(order, owner, "{\"amount\": 250.00}");
        String second = startPayment(order, owner, "{\"amount\": 250}");

        assertThat(second).isEqualTo(first);
    }

    // ---- the full flow ---------------------------------------------------

    @Test
    void placingAnOrderDoesNotSendItToTheRestaurantUntilItIsPaid() throws Exception {
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());

        MvcResult created = mvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + owner)
                        .header("Idempotency-Key", "checkout-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"restaurantId":5,
                                 "items":[{"foodItemId":11,"quantity":2}],
                                 "deliveryAddress":{"recipientName":"A Diner","phone":"9999999999",
                                   "addressLine1":"1 Main St","city":"Mysuru","state":"Karnataka","pincode":"570001"}}"""))
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
                        .content("""
                                {"restaurantId":5,"items":[{"foodItemId":11,"quantity":2}],
                                 "deliveryAddress":{"recipientName":"A Diner","phone":"9999999999",
                                   "addressLine1":"1 Main St","city":"Mysuru","state":"Karnataka","pincode":"570001"}}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderId));
        assertThat(orderRepository.count()).isEqualTo(1);

        String razorpayOrderId = startPayment(orderId, owner, "{}");
        String payment = "pay_IT1";
        mvc.perform(jsonPost("/api/orders/" + orderId + "/payment/verify", owner,
                        verifyBody(razorpayOrderId, payment, sign(razorpayOrderId, payment))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderStatus").value("RESTAURANT_PENDING"))
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.paymentId").value(payment))
                .andExpect(jsonPath("$.paymentProvider").value("RAZORPAY_TEST"))
                .andExpect(jsonPath("$.paidAt").exists());
    }

    @Test
    void aBadSignatureIsRejectedAndAGoodOneIsAppliedExactlyOnceEvenWhenRepeated() throws Exception {
        Order order = savedOrder(7L);
        String razorpayOrderId = startPayment(order, owner);
        String payment = "pay_IT2";

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner,
                        verifyBody(razorpayOrderId, payment, "0".repeat(64))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SIGNATURE"));
        mvc.perform(get("/api/orders/" + order.getId()).header("Authorization", "Bearer " + owner))
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.orderStatus").value("CREATED"));

        String good = verifyBody(razorpayOrderId, payment, sign(razorpayOrderId, payment));
        for (int i = 0; i < 3; i++) {
            mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner, good))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"))
                    .andExpect(jsonPath("$.orderStatus").value("RESTAURANT_PENDING"));
        }

        assertThat(historyStatuses(order.getId()))
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        verify(eventPublisher, times(1)).publishStatusChanged(any(Order.class), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void simultaneousVerificationsApplyThePaymentOnce() throws Exception {
        Order order = savedOrder(7L);
        String razorpayOrderId = startPayment(order, owner);
        String payment = "pay_IT3";
        String body = verifyBody(razorpayOrderId, payment, sign(razorpayOrderId, payment));

        int callers = 6;
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        try {
            List<Callable<Integer>> calls = new java.util.ArrayList<>();
            for (int i = 0; i < callers; i++) {
                calls.add(() -> mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner, body))
                        .andReturn().getResponse().getStatus());
            }
            for (Future<Integer> result : pool.invokeAll(calls)) {
                assertThat(result.get()).isEqualTo(200);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(historyStatuses(order.getId()))
                .containsExactly(OrderStatus.CREATED, OrderStatus.RESTAURANT_PENDING);
        verify(eventPublisher, times(1)).publishStatusChanged(any(Order.class), eq(OrderStatus.CREATED), anyString());
    }

    @Test
    void aRazorpayOrderThatBelongsToAnotherOrderIsRejected() throws Exception {
        Order mine = savedOrder(7L);
        Order theirs = savedOrder(8L);
        String myRazorpayOrder = startPayment(mine, owner);
        String theirRazorpayOrder = startPayment(theirs, otherUser);
        String payment = "pay_IT4";

        // A payment legitimately made for THEIR order, replayed against MY order.
        mvc.perform(jsonPost("/api/orders/" + mine.getId() + "/payment/verify", owner,
                        verifyBody(theirRazorpayOrder, payment, sign(theirRazorpayOrder, payment))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PAYMENT_ORDER_MISMATCH"));

        assertThat(orderRepository.findById(mine.getId()).orElseThrow().getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(myRazorpayOrder).isNotEqualTo(theirRazorpayOrder);
    }

    // ---- already paid / failure / retry ---------------------------------

    @Test
    void anAlreadyPaidOrderCannotStartAnotherPayment() throws Exception {
        Order order = savedOrder(7L);
        String razorpayOrderId = startPayment(order, owner);
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner,
                verifyBody(razorpayOrderId, "pay_IT5", sign(razorpayOrderId, "pay_IT5")))).andExpect(status().isOk());

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/create", owner, "{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_ALREADY_PAID"));

        // and a second, different payment cannot replace the first
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner,
                        verifyBody(razorpayOrderId, "pay_IT5b", sign(razorpayOrderId, "pay_IT5b"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_ALREADY_PAID"));
        assertThat(orderRepository.findById(order.getId()).orElseThrow().getPaymentId()).isEqualTo("pay_IT5");
    }

    @Test
    void aFailedAttemptCanBeRetriedAndThenPaid() throws Exception {
        Order order = savedOrder(7L);
        String razorpayOrderId = startPayment(order, owner);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/failure", owner,
                        "{\"razorpayOrderId\":\"" + razorpayOrderId
                                + "\",\"code\":\"BAD_REQUEST_ERROR\",\"description\":\"Card declined\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("FAILED"))
                .andExpect(jsonPath("$.paymentFailureReason").value("BAD_REQUEST_ERROR: Card declined"))
                .andExpect(jsonPath("$.orderStatus").value("CREATED"));

        // Retry: same Razorpay order, back to PENDING.
        assertThat(startPayment(order, owner)).isEqualTo(razorpayOrderId);
        mvc.perform(get("/api/orders/" + order.getId()).header("Authorization", "Bearer " + owner))
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paymentFailureReason").doesNotExist());

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner,
                        verifyBody(razorpayOrderId, "pay_IT6", sign(razorpayOrderId, "pay_IT6"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"));
    }

    @Test
    void aFailureReportCanNeverUndoAPaidOrder() throws Exception {
        Order order = savedOrder(7L);
        String razorpayOrderId = startPayment(order, owner);
        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner,
                verifyBody(razorpayOrderId, "pay_IT7", sign(razorpayOrderId, "pay_IT7")))).andExpect(status().isOk());

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/failure", owner,
                        "{\"razorpayOrderId\":\"" + razorpayOrderId + "\",\"description\":\"late failure event\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.orderStatus").value("RESTAURANT_PENDING"));
    }

    @Test
    void ordersPlacedBeforeOnlinePaymentsExistedStillLoadAndAreNotPayable() throws Exception {
        // Existing rows: no razorpay/paid columns, already with the restaurant, payment_status PENDING.
        Order legacy = savedOrder(7L);
        legacy.setOrderStatus(OrderStatus.RESTAURANT_PENDING);
        orderRepository.save(legacy);

        mvc.perform(get("/api/orders/" + legacy.getId()).header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paymentExpired").value(false))
                .andExpect(jsonPath("$.paymentId").doesNotExist());
        mvc.perform(jsonPost("/api/orders/" + legacy.getId() + "/payment/create", owner, "{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_PAYABLE"));
    }

    // ---- validation / config --------------------------------------------

    @Test
    void verifyRequiresAllThreeFields() throws Exception {
        Order order = savedOrder(7L);

        mvc.perform(jsonPost("/api/orders/" + order.getId() + "/payment/verify", owner,
                        "{\"razorpayOrderId\":\"\",\"razorpayPaymentId\":\"p\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void verifyOnAnUnknownOrderIsNotFound() throws Exception {
        mvc.perform(jsonPost("/api/orders/999999/payment/verify", owner, verifyBody("o", "p", "s")))
                .andExpect(status().isNotFound());
    }

    @Test
    void configSaysPaymentsAreAvailableInTestMode() throws Exception {
        mvc.perform(get("/api/orders/payment/config").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.mode").value("TEST"));
    }

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

    private String startPayment(Order order, String bearer) throws Exception {
        return startPayment(order.getId(), bearer, "{}");
    }

    private String startPayment(Order order, String bearer, String body) throws Exception {
        return startPayment(order.getId(), bearer, body);
    }

    private String startPayment(long orderId, String bearer, String body) throws Exception {
        MvcResult result = mvc.perform(jsonPost("/api/orders/" + orderId + "/payment/create", bearer, body))
                .andExpect(status().isOk()).andReturn();
        JsonNode node = json.readTree(result.getResponse().getContentAsString());
        return node.get("razorpayOrderId").asText();
    }

    private MockHttpServletRequestBuilder jsonPost(String url, String bearer, String body) {
        MockHttpServletRequestBuilder request = post(url).contentType(MediaType.APPLICATION_JSON).content(body);
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        return request;
    }

    private static String verifyBody(String razorpayOrderId, String paymentId, String signature) {
        return "{\"razorpayOrderId\":\"" + razorpayOrderId + "\",\"razorpayPaymentId\":\"" + paymentId
                + "\",\"razorpaySignature\":\"" + signature + "\"}";
    }

    // The lazily-loaded history is read the way a client sees it: over HTTP.
    private List<OrderStatus> historyStatuses(Long orderId) {
        try {
            MvcResult result = mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + owner))
                    .andExpect(status().isOk()).andReturn();
            List<OrderStatus> statuses = new java.util.ArrayList<>();
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

    private static String sign(String orderId, String paymentId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            StringBuilder hex = new StringBuilder();
            for (byte b : mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8))) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
