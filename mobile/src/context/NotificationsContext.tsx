import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NotificationService } from '../api/notificationService';

type Ctx = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  markAsRead: (ids: number[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const inflight = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const list = await NotificationService.list();
      const count = Array.isArray(list) ? list.filter(n => !n.readAt).length : 0;
      setUnreadCount(count);
    } catch {
    } finally {
      inflight.current = false;
    }
  }, []);

  const markAsRead = useCallback(async (ids: number[]) => {
    try {
      await NotificationService.markAsRead(ids);
    } finally {
      await refreshUnread();
    }
  }, [refreshUnread]);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
    } finally {
      await refreshUnread();
    }
  }, [refreshUnread]);

  useEffect(() => { refreshUnread(); }, [refreshUnread]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
