"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/model/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return <div className="centered-message">Carregando sessão...</div>;
  }

  if (!user && pathname !== "/login") {
    return <div className="centered-message">Redirecionando...</div>;
  }

  return <>{children}</>;
}
