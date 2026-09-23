import apiClient from "./apiClient";
import type { PublicDeliveryPartner } from "../types/models";

export const getDeliveryPartnerPublicInfo = (id: number) =>
  apiClient.get<PublicDeliveryPartner>(`/api/delivery/partners/${id}/public`);
