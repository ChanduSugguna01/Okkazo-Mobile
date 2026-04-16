export interface NotificationItem {
  notificationId: string;
  recipientAuthId: string;
  recipientRole: string;
  type: string;
  category: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
  unread: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}
