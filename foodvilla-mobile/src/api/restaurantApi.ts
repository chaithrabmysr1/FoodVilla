import apiClient from "./apiClient";
import type { Restaurant } from "../types/models";

export const getAllRestaurants = () =>
  apiClient.get<Restaurant[]>("/api/restaurants/getAllRestaurants");

export const getRestaurantById = (id: number) =>
  apiClient.get<Restaurant>(`/api/restaurants/${id}`);
