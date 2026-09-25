import apiClient from "./apiClient";

export const login = (email, password) =>
  apiClient.post("/api/auth/login", { email, password });

export const signup = (formData) =>
  apiClient.post("/api/auth/signup", formData);
