package com.example.foodVilla.foodcatalogue_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class FoodcatalogueServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(FoodcatalogueServiceApplication.class, args);
	}

}
