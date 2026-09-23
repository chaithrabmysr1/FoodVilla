import apiClient from "./apiClient";
import type { AppNotification, Page } from "../types/models";

export const listNotifications = (page = 0, size = 20) =>
  apiClient.get<Page<AppNotification>>("/api/notifications", { params: { page, size } });

export const markRead = (id: number) => apiClient.put<AppNotification>(`/api/notifications/${id}/read`);

export const markAllRead = () => apiClient.put<void>("/api/notifications/read-all");

export const registerDevice = (deviceToken: string, platform: "ios" | "android") =>
  apiClient.post<void>("/api/notifications/devices", { deviceToken, platform });
