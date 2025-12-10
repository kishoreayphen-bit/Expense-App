import { api } from './client';

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export const NotificationService = {
  async list(): Promise<Notification[]> {
    try {
      const resp = await api.get('/api/v1/notifications');
      return resp.data || [];
    } catch (e) {
      console.error('[NotificationService] list error:', e);
      return [];
    }
  },

  async markAsRead(notificationIds: number[]): Promise<void> {
    try {
      await api.post('/api/v1/notifications/mark-read', notificationIds);
    } catch (e) {
      console.error('[NotificationService] markAsRead error:', e);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await api.post('/api/v1/notifications/mark-all-read', {} as any);
    } catch (e) {
      console.error('[NotificationService] markAllAsRead error:', e);
    }
  },
};
