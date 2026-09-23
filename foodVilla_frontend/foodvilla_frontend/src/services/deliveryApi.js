import apiClient from "./apiClient";

export const listDeliveryPartners = (availableOnly) =>
  apiClient.get("/api/delivery/partners", {
    params: availableOnly ? { available: true } : {},
  });

export const createDeliveryPartner = (partner) =>
  apiClient.post("/api/delivery/partners", partner);

export const updateDeliveryPartner = (id, partner) =>
  apiClient.put(`/api/delivery/partners/${id}`, partner);

export const assignDelivery = (orderId, restaurantId, deliveryPartnerId) =>
  apiClient.post("/api/delivery/assignments", { orderId, restaurantId, deliveryPartnerId });

export const markPickedUp = (assignmentId) =>
  apiClient.put(`/api/delivery/assignments/${assignmentId}/picked-up`);

export const markOutForDelivery = (assignmentId) =>
  apiClient.put(`/api/delivery/assignments/${assignmentId}/out-for-delivery`);

export const markDelivered = (assignmentId) =>
  apiClient.put(`/api/delivery/assignments/${assignmentId}/delivered`);

export const getAssignmentForOrder = (orderId) =>
  apiClient.get(`/api/delivery/assignments/order/${orderId}`);
