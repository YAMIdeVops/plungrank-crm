"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type NotificationItem = {
  id: string;
  kind: "meeting";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type NotificationsContextValue = {
  items: NotificationItem[];
  unreadMeetingCount: number;
  pushMeetingNotification: (message: string) => void;
  markMeetingsAsRead: () => void;
};

const STORAGE_KEY = "crm-notifications";

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as NotificationItem[];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function pushMeetingNotification(message: string) {
    setItems((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: "meeting",
        title: "Reunião pendente",
        message,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...current,
    ]);
  }

  function markMeetingsAsRead() {
    setItems((current) =>
      current.map((item) => (item.kind === "meeting" ? { ...item, read: true } : item)),
    );
  }

  const value = useMemo(
    () => ({
      items,
      unreadMeetingCount: items.filter((item) => item.kind === "meeting" && !item.read).length,
      pushMeetingNotification,
      markMeetingsAsRead,
    }),
    [items],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications deve ser usado dentro de NotificationsProvider.");
  }
  return context;
}
