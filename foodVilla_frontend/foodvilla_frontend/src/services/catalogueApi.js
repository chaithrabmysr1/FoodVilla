import apiClient from "./apiClient";

export const getCatalogueByRestaurant = (restaurantId) =>
  apiClient.get(`/api/catalogue/${restaurantId}`);

export const getAllFoodItems = () => apiClient.get("/api/catalogue");

export const createFoodItem = (item) => apiClient.post("/api/catalogue", item);

export const updateFoodItem = (id, item) => apiClient.put(`/api/catalogue/${id}`, item);

export const deleteFoodItem = (id) => apiClient.delete(`/api/catalogue/${id}`);
