import apiClient from "./apiClient";

export const listUsers = () => apiClient.get("/api/users");

export const updateUserRole = (id, role) =>
  apiClient.put(`/api/users/${id}/role`, { role });
