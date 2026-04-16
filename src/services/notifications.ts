import { request } from "@/src/lib/api";
import { ApiEnvelope } from "@/src/types/auth";
import { NotificationItem, NotificationPagination } from "@/src/types/notifications";

interface NotificationListApiResponse extends ApiEnvelope<NotificationItem[]> {
  pagination?: NotificationPagination;
}

interface NotificationUnreadCountResponse extends ApiEnvelope<{ unreadCount?: number }> {}

interface MarkAllReadResponse extends ApiEnvelope<{ updatedCount?: number }> {}

interface MarkReadResponse extends ApiEnvelope<NotificationItem> {}

interface GetNotificationsParams {
  page?: number;
  limit?: number;
  tab?: "all" | "unread" | "system" | "promotions";
  search?: string;
}

const withQuery = (path: string, params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const getNotifications = async (token: string, params: GetNotificationsParams = {}) => {
  const response = await request<NotificationListApiResponse>(
    withQuery("/api/notifications", {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      tab: params.tab ?? "all",
      search: params.search ?? "",
    }),
    { token }
  );

  return {
    items: Array.isArray(response.data) ? response.data : [],
    pagination: response.pagination,
  };
};

export const getUnreadNotificationCount = async (token: string) => {
  const response = await request<NotificationUnreadCountResponse>("/api/notifications/unread-count", { token });
  return Number(response.data?.unreadCount || 0);
};

export const markAllNotificationsRead = async (token: string) => {
  const response = await request<MarkAllReadResponse>("/api/notifications/mark-all-read", {
    method: "PATCH",
    token,
  });

  return Number(response.data?.updatedCount || 0);
};

export const markNotificationRead = async (token: string, notificationId: string) => {
  const id = String(notificationId || "").trim();
  if (!id) return null;

  const response = await request<MarkReadResponse>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    token,
  });

  return response.data;
};
