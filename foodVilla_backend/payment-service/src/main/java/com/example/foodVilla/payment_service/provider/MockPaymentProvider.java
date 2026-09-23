package com.example.foodVilla.payment_service.provider;

import com.example.foodVilla.payment_service.entity.Payment;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * No external calls, no real money — the local-dev default (payment.provider=mock).
 * Confirmation/failure are simulated via PaymentController's
 * POST /api/payments/{id}/confirm and /fail endpoints rather than a webhook.
 */
@Component("mock")
public class MockPaymentProvider implements PaymentProvider {

    @Override
    public String createProviderOrder(Payment payment) {
        return "mock_order_" + UUID.randomUUID();
    }
}
