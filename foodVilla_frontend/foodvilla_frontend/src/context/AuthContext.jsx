import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

function readAuthState() {
  const token = localStorage.getItem("token");
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }
  return { token, user };
}

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState(readAuthState);

  const refresh = useCallback(() => setState(readAuthState()), []);

  useEffect(() => {
    // "authChanged" is dispatched by login()/logout() below and by the
    // apiClient response interceptor on a 401, so every part of the app
    // (Header, ProtectedRoute) reacts immediately without a page reload.
    window.addEventListener("authChanged", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("authChanged", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const login = useCallback((token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("authChanged"));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChanged"));
  }, []);

  const value = {
    token: state.token,
    user: state.user,
    isAuthenticated: Boolean(state.token),
    isAdmin: state.user?.role === "ADMIN",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- context + hook is the standard pairing for this file
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
