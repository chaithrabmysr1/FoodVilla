import apiClient from "./apiClient";
import type { Payment } from "../types/models";

export const initiatePayment = (orderId: number) =>
  apiClient.post<Payment>("/api/payments/initiate", { orderId });

export const confirmPayment = (paymentId: number) =>
  apiClient.post<Payment>(`/api/payments/${paymentId}/confirm`);

export const failPayment = (paymentId: number, reason?: string) =>
  apiClient.post<Payment>(`/api/payments/${paymentId}/fail`, reason ? { reason } : {});

export const getPaymentsForOrder = (orderId: number) =>
  apiClient.get<Payment[]>(`/api/payments/order/${orderId}`);
