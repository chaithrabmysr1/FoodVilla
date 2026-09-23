import apiClient from "./apiClient";

// These live on restaurant-service, not order-service — they publish a
// Kafka event that order-service consumes asynchronously, so the response
// here is just an acknowledgement, not the updated order.
export const acceptOrder = (restaurantId, orderId) =>
  apiClient.put(`/api/restaurants/${restaurantId}/orders/${orderId}/accept`);

export const rejectOrder = (restaurantId, orderId, reason) =>
  apiClient.put(`/api/restaurants/${restaurantId}/orders/${orderId}/reject`, reason ? { reason } : {});

export const markPreparing = (restaurantId, orderId) =>
  apiClient.put(`/api/restaurants/${restaurantId}/orders/${orderId}/preparing`);

export const markReady = (restaurantId, orderId) =>
  apiClient.put(`/api/restaurants/${restaurantId}/orders/${orderId}/ready`);
