import "./globals.css";

import { AuthGuard } from "@/features/auth/model/auth-guard";
import { AuthProvider } from "@/features/auth/model/auth-provider";
import { NotificationsProvider } from "@/features/notifications/model/notification-provider";

export const metadata = {
  title: "CRM PlungRank",
  description: "CRM de prospecção comercial com TypeScript, Next.js e Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <NotificationsProvider>
            <AuthGuard>{children}</AuthGuard>
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
