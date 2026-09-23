import apiClient from "./apiClient";
import type { LoginResponse, SignupRequest } from "../types/models";

export const login = (email: string, password: string) =>
  apiClient.post<LoginResponse>("/api/auth/login", { email, password });

export const signup = (payload: SignupRequest) =>
  apiClient.post<{ message: string }>("/api/auth/signup", payload);
