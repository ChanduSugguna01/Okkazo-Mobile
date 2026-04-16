import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getCoordinatorEvents, splitCurrentAndUpcomingEvents } from "@/src/services/events";
import { palette } from "@/src/theme/palette";
import { PlanningEvent } from "@/src/types/events";
import { resolveHomeRoute } from "@/src/utils/roleRouting";
import CoordinatorBottomMenu from "../../src/components/coordinator/CoordinatorBottomMenu";

type CoordinatorTab = "events" | "operations" | "reports";

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) {
    return "TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const EventCard = ({ event }: { event: PlanningEvent }) => {
  const startAt = event.schedule?.startAt ?? event.eventDate;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/coordinator/events/[eventId]",
          params: { eventId: event.eventId },
        })
      }
      style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
    >
      <View style={styles.eventCardHeader}>
        <Text style={styles.eventTitle}>{event.eventTitle ?? "Untitled Event"}</Text>
        <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
      </View>
      <View style={styles.eventCardBody}>
        <View style={styles.eventDetailRow}>
          <Ionicons name="calendar-outline" size={16} color={palette.textMuted} />
          <Text style={styles.eventDate}>{formatDateLabel(startAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaPillCategory}>{event.category?.toUpperCase() ?? "EVENT"}</Text>
          <Text style={styles.metaPillStatus}>{event.status ?? "UNKNOWN"}</Text>
        </View>
      </View>
    </Pressable>
  );
};

export default function CoordinatorHomePage() {
  const { top } = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<CoordinatorTab>("events");
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managerUserId = profile?.id ?? profile?._id ?? null;

  const loadEvents = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    try {
      setError(null);
      const nextEvents = await getCoordinatorEvents(session.accessToken, managerUserId);
      setEvents(nextEvents);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load events";
      setError(message);
    }
  }, [session?.accessToken, managerUserId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadEvents();
      setLoading(false);
    };

    init();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const eventBuckets = useMemo(() => splitCurrentAndUpcomingEvents(events), [events]);

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
            <Text style={styles.headerTitle}>Welcome, {profile?.name ?? "Team Member"}</Text>
            <Text style={styles.headerSubtitle}>Manage assigned operations and event entries.</Text>
          </View>
          <Pressable 
            onPress={() => router.push("/coordinator/profile" as never)} 
            style={({ pressed }) => [styles.avatarButton, pressed && styles.avatarPressed]}
          >
            <Ionicons name="person-circle" size={54} color={palette.main} />
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          {(["events", "operations", "reports"] as CoordinatorTab[]).map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, selected && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab !== "events" ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="construct-outline" size={32} color={palette.main} style={{ marginBottom: 4 }} />
            <Text style={styles.placeholderTitle}>Coming Soon</Text>
            <Text style={styles.placeholderCopy}>This tab is being prepared for your operations workflow.</Text>
          </View>
        ) : null}

        {activeTab === "events" ? (
          <View style={styles.eventsWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={palette.main} />
              </View>
            ) : (
              <>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Text style={styles.sectionTitle}>Current Events</Text>
                {eventBuckets.current.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No current events assigned.</Text>
                  </View>
                ) : (
                  eventBuckets.current.map((event) => <EventCard key={`current-${event.eventId}`} event={event} />)
                )}

                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                {eventBuckets.upcoming.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No upcoming events assigned.</Text>
                  </View>
                ) : (
                  eventBuckets.upcoming.map((event) => <EventCard key={`upcoming-${event.eventId}`} event={event} />)
                )}
              </>
            )}
          </View>
        ) : null}

      </ScrollView>

      <CoordinatorBottomMenu activeMenu="home" />
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
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
  },
  headerTextCol: {
    flex: 1,
    gap: 6,
    paddingRight: 16,
  },
  headerEyebrow: {
    color: palette.accent,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  avatarButton: {
    borderRadius: 27,
    backgroundColor: palette.surface,
    elevation: 4,
    shadowColor: palette.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  avatarPressed: {
    opacity: 0.7,
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: palette.surface,
    elevation: 2,
    shadowColor: palette.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabButtonActive: {
    backgroundColor: palette.main,
  },
  tabText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#002c72",
  },
  placeholderCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    padding: 32,
    alignItems: "center",
    gap: 8,
    elevation: 3,
    shadowColor: palette.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  placeholderTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  placeholderCopy: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  eventsWrap: {
    gap: 16,
  },
  sectionTitle: {
    marginTop: 8,
    color: palette.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  eventCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    elevation: 3,
    shadowColor: palette.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  eventCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.03,
  },
  eventCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    color: palette.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  eventCardBody: {
    gap: 12,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventDate: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  metaPillCategory: {
    backgroundColor: "#313442",
    color: palette.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metaPillStatus: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    color: palette.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "rgba(255, 180, 171, 0.15)",
    padding: 12,
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 15,
  },
});
