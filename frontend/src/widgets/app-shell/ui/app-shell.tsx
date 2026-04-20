"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/model/auth-provider";
import { useNotifications } from "@/features/notifications/model/notification-provider";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/tentativas", label: "Tentativas" },
  { href: "/reunioes", label: "Reuniões" },
  { href: "/vendas", label: "Vendas" },
  { href: "/servicos", label: "Serviços" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadMeetingCount, markMeetingsAsRead } = useNotifications();

  useEffect(() => {
    if (pathname === "/reunioes" && unreadMeetingCount > 0) {
      markMeetingsAsRead();
    }
  }, [markMeetingsAsRead, pathname, unreadMeetingCount]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark brand-mark-logo">
            <Image
              src="/logo/logotipo.png"
              alt="CRM PlungRank"
              width={42}
              height={42}
              className="brand-mark-image"
              priority
            />
          </div>
          <div className="sidebar-brand-copy">
            <h1>CRM PlungRank</h1>
          </div>
        </div>

        <div className="sidebar-section">
          <nav className="nav-list">
            {navigation
              .filter((item) => item.href !== "/admin/usuarios" || user?.perfil !== "PADRAO")
              .map((item) => {
                const active = pathname === item.href;
                const showMeetingBadge = item.href === "/reunioes" && unreadMeetingCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "nav-link active" : "nav-link"}
                  >
                    <span className="nav-link-main">
                      <span className="nav-link-dot" />
                      <span>{item.label}</span>
                    </span>
                    {showMeetingBadge ? (
                      <span className={active ? "nav-badge nav-badge-active" : "nav-badge"}>
                        {unreadMeetingCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.nome?.slice(0, 1) ?? "U"}</div>
            <div className="stack-sm">
              <strong>{user?.nome}</strong>
              <span className="muted">{user?.email}</span>
            </div>
          </div>
          <div className="user-meta">
            <span className="chip chip-soft">{user?.perfil}</span>
            <span className="chip chip-success">Sessão ativa</span>
          </div>
          <button className="secondary-button wide-button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
