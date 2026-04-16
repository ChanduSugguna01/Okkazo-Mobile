import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/providers/AuthProvider";
import {
  getUnreadNotificationCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/src/services/notifications";
import { palette } from "@/src/theme/palette";
import { NotificationItem } from "@/src/types/notifications";
import { resolveHomeRoute } from "@/src/utils/roleRouting";
import CoordinatorBottomMenu from "../../src/components/coordinator/CoordinatorBottomMenu";

const toDateLabel = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function CoordinatorNotificationsPage() {
  const { top } = useSafeAreaInsets();
  const { session, profile } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setError(null);
      const [response, nextUnreadCount] = await Promise.all([
        getNotifications(session.accessToken, {
          tab: "all",
          page: 1,
          limit: 100,
        }),
        getUnreadNotificationCount(session.accessToken).catch(() => 0),
      ]);
      setItems(response.items);
      setUnreadCount(nextUnreadCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setError(message);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    };

    init();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const onMarkAllRead = useCallback(async () => {
    if (!session?.accessToken || markingAll) return;

    try {
      setMarkingAll(true);
      await markAllNotificationsRead(session.accessToken);
      setItems((prev) => prev.map((item) => ({ ...item, unread: false, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, session?.accessToken]);

  const onOpenNotification = useCallback(async (item: NotificationItem) => {
    if (!session?.accessToken) return;

    if (item.unread) {
      try {
        await markNotificationRead(session.accessToken, item.notificationId);
        setItems((prev) => prev.map((row) => (
          row.notificationId === item.notificationId
            ? { ...row, unread: false, readAt: new Date().toISOString() }
            : row
        )));
      } catch {
        // Read-mark is best effort for now.
      }
    }

    const actionUrl = String(item.actionUrl || "").trim();
    if (actionUrl.startsWith("/coordinator")) {
      router.push(actionUrl as never);
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (resolveHomeRoute(profile, session.role) !== "/coordinator") {
    return <Redirect href="/coming-soon" />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(top, 32) + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.main} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerEyebrow}>COORDINATOR CONSOLE</Text>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <Pressable
            onPress={onMarkAllRead}
            disabled={markingAll || items.length === 0}
            style={({ pressed }) => [styles.markAllButton, pressed && !markingAll && styles.markAllPressed, (markingAll || items.length === 0) && styles.markAllDisabled]}
          >
            <Text style={styles.markAllText}>{markingAll ? "MARKING..." : "MARK ALL"}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.main} />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={28} color={palette.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>New system and event updates will appear here.</Text>
          </View>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <View style={styles.listWrap}>
            {items.map((item) => (
              <Pressable
                key={item.notificationId}
                onPress={() => onOpenNotification(item)}
                style={({ pressed }) => [styles.notificationCard, item.unread && styles.notificationCardUnread, pressed && styles.notificationCardPressed]}
              >
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle} numberOfLines={1}>{item.title || "Notification"}</Text>
                  {item.unread ? <View style={styles.unreadDot} /> : null}
                </View>

                <Text style={styles.notificationMessage}>{item.message || "You have a new notification."}</Text>

                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationCategory}>{String(item.category || "SYSTEM")}</Text>
                  <Text style={styles.notificationDate}>{toDateLabel(item.createdAt)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <CoordinatorBottomMenu activeMenu="notifications" unreadCount={unreadCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  content: {
    padding: 20,
    paddingBottom: 130,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerEyebrow: {
    color: palette.accent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: palette.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  markAllButton: {
    borderRadius: 999,
    backgroundColor: palette.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllPressed: {
    opacity: 0.8,
  },
  markAllDisabled: {
    opacity: 0.55,
  },
  markAllText: {
    color: "#002c72",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  errorCard: {
    borderRadius: 14,
    backgroundColor: "rgba(255, 180, 171, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.25)",
    padding: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 18,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  listWrap: {
    gap: 12,
  },
  notificationCard: {
    borderRadius: 18,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    padding: 14,
    gap: 10,
  },
  notificationCardUnread: {
    borderColor: "rgba(177, 197, 255, 0.6)",
    backgroundColor: "rgba(27, 31, 44, 0.95)",
  },
  notificationCardPressed: {
    opacity: 0.85,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.main,
  },
  notificationMessage: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  notificationCategory: {
    color: palette.main,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  notificationDate: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
});
