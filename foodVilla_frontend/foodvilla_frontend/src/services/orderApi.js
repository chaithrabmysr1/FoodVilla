import apiClient from "./apiClient";

export const createOrder = (orderRequest, idempotencyKey) =>
  apiClient.post("/api/orders", orderRequest, {
    headers: { "Idempotency-Key": idempotencyKey },
  });

export const getMyOrders = (page = 0, size = 20) =>
  apiClient.get("/api/orders", { params: { page, size } });

export const getOrderById = (id) => apiClient.get(`/api/orders/${id}`);

export const cancelOrder = (id, reason) =>
  apiClient.put(`/api/orders/${id}/cancel`, reason ? { reason } : {});

// --- Admin ---

export const getAllOrdersAdmin = (status, page = 0, size = 20) =>
  apiClient.get("/api/orders/admin", { params: { status: status || undefined, page, size } });

export const getOrdersForRestaurant = (restaurantId, page = 0, size = 20) =>
  apiClient.get(`/api/orders/restaurant/${restaurantId}`, { params: { page, size } });

export const updateOrderStatus = (id, status, note) =>
  apiClient.put(`/api/orders/${id}/status`, { status, note });
