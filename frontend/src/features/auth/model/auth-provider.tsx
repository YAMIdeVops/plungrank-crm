"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/shared/api/http";
import type { AuthUser } from "@/entities/user/model/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refreshUser() {
    try {
      const response = await apiFetch<{ user: AuthUser }>("/auth/me");
      setUser(response.user);
    } catch (_error) {
      window.localStorage.removeItem("crm-token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = window.localStorage.getItem("crm-token");
    if (!token) {
      setLoading(false);
      return;
    }
    void refreshUser();
  }, []);

  async function login(email: string, password: string) {
    const response = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    window.localStorage.setItem("crm-token", response.token);
    setUser(response.user);
    router.push("/");
  }

  function logout() {
    window.localStorage.removeItem("crm-token");
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
