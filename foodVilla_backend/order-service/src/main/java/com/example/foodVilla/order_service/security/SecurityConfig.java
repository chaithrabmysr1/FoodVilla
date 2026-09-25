package com.example.foodVilla.order_service.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // Container error re-dispatch (sendError) arrives unauthenticated;
                        // without this the entry point below would rewrite a real 403 to 401.
                        .requestMatchers("/error").permitAll()
                        // Order data is private — unlike restaurant/catalogue, there
                        // are no public GETs here. Admin-only surfaces are explicit:
                        // there's no restaurant-staff account model yet, so these
                        // operator views are gated to ADMIN for now.
                        .requestMatchers(HttpMethod.GET, "/api/orders/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/orders/restaurant/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/orders/*/status").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                // A missing/expired/invalid token must answer 401, not Spring's
                // default 403 — the frontend only clears a dead session (and sends
                // the user back to login) on a 401. Authenticated-but-not-allowed
                // requests (e.g. a USER hitting an ADMIN route) still get 403.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
