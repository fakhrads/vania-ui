"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthState {
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState>({
  token: null,
  loading: true,
  login: async () => null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("vn_token");
    if (saved) setToken(saved);
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const { token: t } = await res.json();
    localStorage.setItem("vn_token", t);
    setToken(t);
    return t;
  };

  const logout = () => {
    localStorage.removeItem("vn_token");
    setToken(null);
  };

  return (
    <AuthCtx.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
