import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/env";

export const TOKEN_KEY = "foodvilla_token";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Every request reads the token fresh from SecureStore rather than relying
// on an in-memory copy — keeps this module decoupled from Redux (no
// circular import between the store and the client that every slice uses).
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

// Called once from the Redux store setup (see store/store.ts) so a 401 can
// dispatch logout without this module importing the store directly.
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
