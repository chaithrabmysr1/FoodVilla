package com.example.foodVilla.order_service.entity;

/**
 * Payment state of an order, independent of {@link OrderStatus}.
 *
 * <pre>
 *   PENDING  -> CONFIRMED   the payment was recorded server-side (shown to users as "Paid")
 *   PENDING  -> FAILED      only set by older payment attempts; nothing sets it now
 *   FAILED   -> CONFIRMED   the customer pays the order after a failed attempt
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
