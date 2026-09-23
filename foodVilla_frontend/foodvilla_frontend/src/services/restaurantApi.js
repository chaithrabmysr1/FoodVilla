import apiClient from "./apiClient";

export const getAllRestaurants = () =>
  apiClient.get("/api/restaurants/getAllRestaurants");

export const getRestaurantById = (id) =>
  apiClient.get(`/api/restaurants/${id}`);

export const createRestaurant = (restaurant) =>
  apiClient.post("/api/restaurants", restaurant);

export const updateRestaurant = (id, restaurant) =>
  apiClient.put(`/api/restaurants/${id}`, restaurant);

export const deleteRestaurant = (id) =>
  apiClient.delete(`/api/restaurants/${id}`);
