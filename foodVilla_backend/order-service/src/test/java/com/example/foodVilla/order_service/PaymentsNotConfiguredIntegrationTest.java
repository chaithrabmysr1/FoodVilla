package com.example.foodVilla.order_service;

import com.example.foodVilla.order_service.dto.CatalogueFoodItemDTO;
import com.example.foodVilla.order_service.dto.CatalogueResponseDTO;
import com.example.foodVilla.order_service.dto.RestaurantDTO;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * No Razorpay credentials at all: the application must still start and serve
 * everything except paying, and the payment endpoints must say why.
 */
@SpringBootTest(properties = {
        "payment.razorpay.key-id=",
        "payment.razorpay.key-secret="
})
@AutoConfigureMockMvc
@ActiveProfiles("payment-it")
class PaymentsNotConfiguredIntegrationTest {

    @Autowired private MockMvc mvc;

    @MockitoBean private OrderEventPublisher eventPublisher;
    @MockitoBean private RestTemplate restTemplate;

    private final String owner = Jwts.builder()
            .setSubject("diner@example.com").claim("role", "USER").claim("userId", 7L)
            .setExpiration(new Date(System.currentTimeMillis() + 3_600_000))
            .signWith(Keys.hmacShaKeyFor("payment-integration-test-signing-key-0123456789abcdef".getBytes()),
                    SignatureAlgorithm.HS256)
            .compact();

    @Test
    void theApplicationStartsAndReportsThatPaymentsAreUnavailable() throws Exception {
        mvc.perform(get("/api/orders/payment/config").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.mode").value("TEST"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("not configured")));
    }

    @Test
    void payingSaysWhyItCannotHappenInsteadOfCrashing() throws Exception {
        mvc.perform(post("/api/orders/1/payment/create").header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("PAYMENT_NOT_CONFIGURED"));
        mvc.perform(post("/api/orders/1/payment/verify").header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"razorpayOrderId\":\"o\",\"razorpayPaymentId\":\"p\",\"razorpaySignature\":\"s\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("PAYMENT_NOT_CONFIGURED"));
    }

    @Test
    void everythingElseKeepsWorking() throws Exception {
        when(restTemplate.getForObject(anyString(), eq(CatalogueResponseDTO.class))).thenReturn(catalogue());

        mvc.perform(get("/api/orders").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk());
        mvc.perform(post("/api/orders/quote").header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"restaurantId\":5,\"items\":[{\"foodItemId\":11,\"quantity\":1}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.finalAmount").value(145.00));
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
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
}
