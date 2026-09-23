import apiClient from "./apiClient";
import type { CreateOrderRequest, Order, Page } from "../types/models";

export const createOrder = (payload: CreateOrderRequest, idempotencyKey: string) =>
  apiClient.post<Order>("/api/orders", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });

export const getMyOrders = (page = 0, size = 20) =>
  apiClient.get<Page<Order>>("/api/orders", { params: { page, size } });

export const getOrderById = (id: number) => apiClient.get<Order>(`/api/orders/${id}`);

export const cancelOrder = (id: number, reason?: string) =>
  apiClient.put<Order>(`/api/orders/${id}/cancel`, reason ? { reason } : {});
