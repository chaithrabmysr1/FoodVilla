package com.example.foodVilla.order_service.exception;

import org.springframework.http.HttpStatus;

/**
 * A payment request that can't be honoured. Carries a stable machine-readable
 * {@code code} next to the HTTP status so the web app can tell "already paid"
 * from "expired" from "payments not configured" without parsing message text.
 */
public class PaymentException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public PaymentException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }

    public String getCode() { return code; }
}
