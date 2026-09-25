package com.example.foodVilla.order_service.entity;

/**
 * Payment state of an order, independent of {@link OrderStatus}.
 *
 * <pre>
 *   PENDING  -> CONFIRMED   payment signature verified server-side (shown to users as "Paid")
 *   PENDING  -> FAILED      Razorpay Checkout reported a failed attempt
 *   FAILED   -> PENDING     the customer retries; FAILED -> CONFIRMED if that attempt turns out to succeed
 * </pre>
 *
 * CONFIRMED is the "paid" value. It is not called PAID because
 * {@code orders.payment_status} is a native MySQL {@code enum('CONFIRMED','FAILED','PENDING')}
 * in every database created so far, and Hibernate's {@code ddl-auto: update}
 * never alters an existing column — a new PAID value would be rejected by
 * MySQL at the moment a payment is recorded. Renaming it needs a real schema
 * migration, so the existing names are reused and CONFIRMED never changes.
 * A paid order is never moved back.
 */
public enum PaymentStatus {
    PENDING,
    CONFIRMED,
    FAILED
}
