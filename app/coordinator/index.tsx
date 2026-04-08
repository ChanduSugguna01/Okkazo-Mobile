import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import { getCoordinatorEvents, splitCurrentAndUpcomingEvents } from "@/src/services/events";
import { palette } from "@/src/theme/palette";
import { PlanningEvent } from "@/src/types/events";
import { resolveHomeRoute } from "@/src/utils/roleRouting";

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
      style={styles.eventCard}
    >
      <Text style={styles.eventTitle}>{event.eventTitle ?? "Untitled Event"}</Text>
      <Text style={styles.eventDate}>{formatDateLabel(startAt)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>{event.category?.toUpperCase() ?? "EVENT"}</Text>
        <Text style={styles.metaPill}>{event.status ?? "UNKNOWN"}</Text>
      </View>
    </Pressable>
  );
};

export default function CoordinatorHomePage() {
  const { session, profile, signOut } = useAuth();
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
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.main} />}
      >
        <View style={styles.headerCard}>
          <Text style={styles.headerEyebrow}>Coordinator Console</Text>
          <Text style={styles.headerTitle}>Welcome, {profile?.name ?? "Team Member"}</Text>
          <Text style={styles.headerSubtitle}>Manage assigned events and verify ticket QR entries.</Text>
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
                  <Text style={styles.emptyText}>No current events assigned.</Text>
                ) : (
                  eventBuckets.current.map((event) => <EventCard key={`current-${event.eventId}`} event={event} />)
                )}

                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                {eventBuckets.upcoming.length === 0 ? (
                  <Text style={styles.emptyText}>No upcoming events assigned.</Text>
                ) : (
                  eventBuckets.upcoming.map((event) => <EventCard key={`upcoming-${event.eventId}`} event={event} />)
                )}
              </>
            )}
          </View>
        ) : null}

        <Pressable onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },
  headerCard: {
    backgroundColor: palette.main,
    borderRadius: 18,
    padding: 18,
    gap: 6,
  },
  headerEyebrow: {
    color: "#c6d8ff",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#e8eeff",
    fontSize: 14,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: palette.surface,
  },
  tabButtonActive: {
    backgroundColor: palette.main,
    borderColor: palette.main,
  },
  tabText: {
    color: palette.main,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  placeholderCard: {
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 6,
  },
  placeholderTitle: {
    color: palette.main,
    fontSize: 18,
    fontWeight: "700",
  },
  placeholderCopy: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  eventsWrap: {
    gap: 10,
  },
  sectionTitle: {
    marginTop: 8,
    color: palette.main,
    fontSize: 17,
    fontWeight: "800",
  },
  eventCard: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 4,
  },
  eventTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  eventDate: {
    color: palette.textMuted,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaPill: {
    backgroundColor: "#e6ebfb",
    color: palette.main,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "600",
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: "center",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  signOutButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: palette.surface,
  },
  signOutText: {
    color: palette.main,
    fontSize: 14,
    fontWeight: "700",
  },
});
