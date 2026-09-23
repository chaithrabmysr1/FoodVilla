import apiClient from "./apiClient";
import type { CatalogueResponse } from "../types/models";

export const getCatalogueByRestaurant = (restaurantId: number) =>
  apiClient.get<CatalogueResponse>(`/api/catalogue/${restaurantId}`);
