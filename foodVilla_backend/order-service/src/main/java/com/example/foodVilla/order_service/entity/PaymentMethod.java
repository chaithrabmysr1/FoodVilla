package com.example.foodVilla.order_service.entity;

import java.util.Optional;

/**
 * How the customer chose to pay. Stored on the order as the plain enum name in a
 * varchar column (not a native DB enum), so adding a method later never needs a
 * schema change.
 */
public enum PaymentMethod {
    UPI("UPI"),
    CARD("Card"),
    NETBANKING("Net Banking"),
    PAYTM("Paytm"),
    PAYPAL("PayPal");

    private final String label;

    PaymentMethod(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Case-insensitive lookup; empty for anything that is not a known method. */
    public static Optional<PaymentMethod> parse(String value) {
        if (value == null) {
            return Optional.empty();
        }
        for (PaymentMethod method : values()) {
            if (method.name().equalsIgnoreCase(value.trim())) {
                return Optional.of(method);
            }
        }
        return Optional.empty();
    }
}
