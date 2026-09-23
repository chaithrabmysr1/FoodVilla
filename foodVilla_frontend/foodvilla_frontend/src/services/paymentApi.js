import apiClient from "./apiClient";

export const initiatePayment = (orderId) =>
  apiClient.post("/api/payments/initiate", { orderId });

export const confirmPayment = (paymentId) =>
  apiClient.post(`/api/payments/${paymentId}/confirm`);

export const failPayment = (paymentId, reason) =>
  apiClient.post(`/api/payments/${paymentId}/fail`, reason ? { reason } : {});

export const getPaymentsForOrder = (orderId) =>
  apiClient.get(`/api/payments/order/${orderId}`);
