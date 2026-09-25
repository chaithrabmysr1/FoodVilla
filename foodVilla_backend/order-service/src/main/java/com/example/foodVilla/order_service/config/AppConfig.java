package com.example.foodVilla.order_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Clock;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // Same zone as the entities' LocalDateTime.now(), so createdAt-based
    // comparisons (payment expiry) line up.
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
