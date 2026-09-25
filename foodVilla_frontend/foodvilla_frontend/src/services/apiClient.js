import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the JWT (if present) to every outgoing request. Login already
// stores it under localStorage["token"] — this was the missing wiring that
// meant it never actually reached the backend before.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the token is missing/expired/invalid — clear stale auth state
// so the rest of the app (Header, ProtectedRoute) reflects "logged out"
// rather than showing a broken logged-in UI.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChanged"));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
