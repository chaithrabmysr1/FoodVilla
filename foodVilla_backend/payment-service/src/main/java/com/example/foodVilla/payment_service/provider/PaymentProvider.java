package com.example.foodVilla.payment_service.provider;

import com.example.foodVilla.payment_service.entity.Payment;

/**
 * Selected by payment.provider ("mock" or "razorpay") — see
 * PaymentService's provider map injection.
 */
public interface PaymentProvider {

    /**
     * Creates the provider-side order/intent for this payment and returns
     * its id (stored as Payment.providerOrderId). Must not perform any
     * local persistence itself.
     */
    String createProviderOrder(Payment payment);
}
