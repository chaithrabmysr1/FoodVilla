import apiClient from "./apiClient";

// Razorpay TEST MODE payments — served by order-service behind the gateway.
// Nothing here ever handles the Razorpay secret; the browser only receives the
// public key id (in the create response) and Razorpay's per-payment signature.

// Is paying possible at all? { available, mode: "TEST", message }
export const getPaymentConfig = () => apiClient.get("/api/orders/payment/config");

// The amount is advisory: the backend charges the total stored on the order and
// refuses (409 AMOUNT_MISMATCH) if the figure the customer saw differs.
export const createPayment = (orderId, amount) =>
  apiClient.post(`/api/orders/${orderId}/payment/create`, { amount });

// payload: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
export const verifyPayment = (orderId, payload) =>
  apiClient.post(`/api/orders/${orderId}/payment/verify`, payload);

// payload: { razorpayOrderId, razorpayPaymentId?, code?, description? }
// Records a failed attempt; it can never mark an order paid.
export const reportPaymentFailure = (orderId, payload) =>
  apiClient.post(`/api/orders/${orderId}/payment/failure`, payload);

// Asks the backend to check with Razorpay whether a payment actually went
// through (recovery after a refresh / dropped connection).
export const syncPayment = (orderId) => apiClient.post(`/api/orders/${orderId}/payment/sync`);
