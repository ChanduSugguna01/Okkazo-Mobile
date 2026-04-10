import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/providers/AuthProvider";
import { getPlanningEventById, getEventTicketGuests } from "@/src/services/events";
import { palette } from "@/src/theme/palette";
import { PlanningEvent, EventTicketGuest } from "@/src/types/events";

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

export default function EventDetailsPage() {
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const { session } = useAuth();

  const [event, setEvent] = useState<PlanningEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [guests, setGuests] = useState<EventTicketGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestError, setGuestError] = useState<string | null>(null);

  const normalizedEventId = useMemo(() => {
    if (!eventId) {
      return "";
    }

    return Array.isArray(eventId) ? eventId[0] : eventId;
  }, [eventId]);

  useEffect(() => {
    const load = async () => {
      if (!session?.accessToken || !normalizedEventId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const details = await getPlanningEventById(session.accessToken, normalizedEventId);
        setEvent(details);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load event";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session?.accessToken, normalizedEventId]);

  useEffect(() => {
    const loadGuests = async () => {
      if (!session?.accessToken || !normalizedEventId) {
        setLoadingGuests(false);
        return;
      }
      try {
        setLoadingGuests(true);
        setGuestError(null);
        const guestData = await getEventTicketGuests(session.accessToken, normalizedEventId);
        setGuests(guestData || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load guest list";
        setGuestError(message);
      } finally {
        setLoadingGuests(false);
      }
    };

    loadGuests();
  }, [session?.accessToken, normalizedEventId]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  const { top } = useSafeAreaInsets();
  const startAt = event?.schedule?.startAt ?? event?.eventDate;
  const endAt = event?.schedule?.endAt;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(top, 32) + 16 }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.main} />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && event ? (
          <View style={styles.card}>
            <Text style={styles.title}>{event.eventTitle ?? "Untitled Event"}</Text>
            <Text style={styles.subtitle}>Event ID: {event.eventId}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{event.status ?? "UNKNOWN"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{event.category ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Starts</Text>
              <Text style={styles.infoValue}>{formatDateLabel(startAt)}</Text>
            </View>
            {endAt ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ends</Text>
                <Text style={styles.infoValue}>{formatDateLabel(endAt)}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.location?.name ?? "TBD"}</Text>
            </View>

            {event.eventDescription ? (
              <View style={styles.descriptionWrap}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.descriptionText}>{event.eventDescription}</Text>
              </View>
            ) : null}

            <View style={styles.tagWrap}>
              {(event.selectedServices ?? []).map((item) => (
                <Text key={item} style={styles.tag}>
                  {item}
                </Text>
              ))}
            </View>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/coordinator/scan",
                  params: { eventId: event.eventId },
                })
              }
              style={styles.scanButton}
            >
              <Text style={styles.scanButtonText}>Scan & Verify Ticket QR</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Guest List Section */}
        {!loading && event ? (
          <View style={styles.guestSection}>
            <Text style={styles.guestTitle}>Guest List</Text>
            
            {loadingGuests ? (
              <ActivityIndicator size="small" color={palette.main} style={{ marginVertical: 20 }} />
            ) : guestError ? (
              <Text style={styles.errorText}>{guestError}</Text>
            ) : guests.length === 0 ? (
              <Text style={styles.emptyGuestText}>No guests found.</Text>
            ) : (
              <View style={styles.guestListWrap}>
                {guests.map((guest, idx) => {
                  const verified = guest.verification?.status?.toUpperCase() === "VERIFIED" || guest.ticketStatus?.toUpperCase() === "ATTENDED";
                  const quantity = guest.tickets?.noOfTickets || 1;
                  const guestName = guest.guestName || guest.userAuthId?.slice(0, 8) || "Guest";
                  
                  return (
                    <View key={guest.ticketId} style={styles.guestCard}>
                      <View style={styles.guestRow}>
                        <View style={styles.guestSerialBadge}>
                          <Text style={styles.guestSerialText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.guestInfoCol}>
                          <Text style={styles.guestName}>{guestName}</Text>
                          <Text style={styles.guestMetaText}>Ticket: {guest.ticketId.slice(0, 8).toUpperCase()}</Text>
                          <Text style={styles.guestMetaText}>Qty: {quantity}</Text>
                        </View>
                        <View style={[styles.statusBadge, verified && styles.statusBadgeVerified]}>
                          <Text style={[styles.statusText, verified && styles.statusTextVerified]}>
                            {verified ? "ATTENDED" : guest.ticketStatus}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  backLink: {
    color: palette.main,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingWrap: {
    paddingVertical: 26,
    alignItems: "center",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 9,
  },
  title: {
    color: palette.main,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  infoLabel: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  infoValue: {
    color: palette.textPrimary,
    fontSize: 13,
    flexShrink: 1,
    textAlign: "right",
  },
  descriptionWrap: {
    marginTop: 4,
    gap: 4,
  },
  descriptionText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  tagWrap: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "#dce5ff",
    color: palette.main,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
  },
  scanButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: palette.accent,
    paddingVertical: 13,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  guestSection: {
    marginTop: 8,
    gap: 12,
  },
  guestTitle: {
    color: palette.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 4,
  },
  emptyGuestText: {
    color: palette.textMuted,
    fontSize: 14,
    marginLeft: 4,
  },
  guestListWrap: {
    gap: 8,
  },
  guestCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guestSerialBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  guestSerialText: {
    color: palette.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  guestInfoCol: {
    flex: 1,
    gap: 2,
  },
  guestName: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  guestMetaText: {
    color: palette.textMuted,
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: "rgba(255, 180, 171, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeVerified: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  statusText: {
    color: palette.danger,
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextVerified: {
    color: palette.success,
  },
});
