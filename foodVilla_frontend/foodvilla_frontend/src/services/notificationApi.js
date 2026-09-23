import apiClient from "./apiClient";

export const listNotifications = (page = 0, size = 20) =>
  apiClient.get("/api/notifications", { params: { page, size } });

export const markRead = (id) => apiClient.put(`/api/notifications/${id}/read`);

export const markAllRead = () => apiClient.put("/api/notifications/read-all");
