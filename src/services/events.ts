import { request } from "@/src/lib/api";
import { ApiEnvelope } from "@/src/types/auth";
import { EventTicketGuest, PlanningEvent, QrVerificationResult } from "@/src/types/events";

interface ManagerEventsPayload {
  events: PlanningEvent[];
}

interface PromoteEvent {
  eventId?: string;
  _id?: string;
  eventTitle?: string;
  title?: string;
  eventCategory?: string;
  category?: string;
  eventStatus?: string;
  status?: string;
  authId?: string;
  assignedManagerId?: string | null;
  managerId?: string | null;
  coreStaffIds?: string[];
  eventDescription?: string;
  eventDate?: string | null;
  schedule?: PlanningEvent["schedule"];
  location?: PlanningEvent["location"];
  venue?: { locationName?: string | null };
  selectedServices?: string[];
  eventField?: string | null;
}

const toIsoDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStartDate = (event: PlanningEvent) => {
  return toIsoDate(event.schedule?.startAt ?? event.eventDate ?? null);
};

const getEndDate = (event: PlanningEvent) => {
  return toIsoDate(event.schedule?.endAt ?? event.eventDate ?? null);
};

const dedupeByEventId = (events: PlanningEvent[]) => {
  const map = new Map<string, PlanningEvent>();

  for (const item of events) {
    const id = (item as any).eventId ?? (item as any).id ?? null;
    if (!id) continue;
    map.set(String(id), item);
  }

  return Array.from(map.values());
};

const sortByDate = (events: PlanningEvent[]) => {
  return [...events].sort((a, b) => {
    const aTime = getStartDate(a)?.getTime() ?? 0;
    const bTime = getStartDate(b)?.getTime() ?? 0;
    return aTime - bTime;
  });
};

const toPlanningLike = (event: PromoteEvent): PlanningEvent => {
  const eventId = String(event.eventId ?? event._id ?? "");
  return {
    eventId,
    eventSource: "promote",
    eventTitle: event.eventTitle ?? event.title,
    category: event.eventCategory ?? event.category,
    status: event.eventStatus ?? event.status,
    authId: event.authId,
    assignedManagerId: event.assignedManagerId ?? event.managerId ?? null,
    coreStaffIds: event.coreStaffIds ?? [],
    eventDescription: event.eventDescription,
    eventDate: event.eventDate ?? event.schedule?.startAt ?? null,
    schedule: event.schedule,
    location: event.location ?? (event.venue?.locationName ? { name: event.venue.locationName } : undefined),
    selectedServices: event.selectedServices,
    eventField: event.eventField ?? null,
  };
};

const withPlanningSource = (event: PlanningEvent): PlanningEvent => ({
  ...event,
  eventSource: "planning",
});

const normalizeCandidates = (value?: string | string[] | null) => {
  if (!value) return [] as string[];
  const list = Array.isArray(value) ? value : [value];
  return list.filter(Boolean).map((item) => String(item));
};

export const getCoordinatorEvents = async (token: string, managerUserId?: string | string[] | null) => {
  const managerResponse = await request<ApiEnvelope<ManagerEventsPayload>>(
    "/api/events/planning/manager/events?limit=200",
    { token }
  );

  const managerEvents = (managerResponse.data?.events ?? []).filter(
    (event) => event.status?.toUpperCase() !== "CANCELLED"
  ).map(withPlanningSource);

  let allPlanningEvents: PlanningEvent[] = [];
  let promoteEvents: PlanningEvent[] = [];
  try {
    const response = await request<ApiEnvelope<PlanningEvent[]>>(
      "/api/events/planning?limit=200",
      { token }
    );
    allPlanningEvents = Array.isArray(response.data) ? response.data.map(withPlanningSource) : [];
  } catch {
    allPlanningEvents = [];
  }

  try {
    const response = await request<ApiEnvelope<ManagerEventsPayload>>(
      "/api/events/promote/manager/events?limit=200",
      { token }
    );
    promoteEvents = (response.data?.events ?? []).map(toPlanningLike);
  } catch {
    promoteEvents = [];
  }

  const candidates = normalizeCandidates(managerUserId);
  if (candidates.length === 0) {
    return sortByDate(dedupeByEventId([...managerEvents, ...promoteEvents]));
  }

  const assigned = allPlanningEvents.filter((event) => {
    const isCancelled = event.status?.toUpperCase() === "CANCELLED";
    if (isCancelled) {
      return false;
    }

    // Normalize comparison values and check several possible fields the backend
    // may store the assigned manager id in (defensive checks).
    if (candidates.length === 0) return false;

    const assignedManagerId = (event as any).assignedManagerId ?? (event as any).managerId ?? null;
    const assignedManagerAuthId = (event as any).assignedManagerAuthId ?? null;
    const eventAuthId = (event as any).authId ?? (event as any).ownerAuthId ?? null;
    const assignedManagerObjAuthId = (event as any).assignedManager?.authId ?? (event as any).manager?.authId ?? null;

    const matchAssigned = candidates.some((candidate) => (
      assignedManagerId === candidate ||
      assignedManagerAuthId === candidate ||
      assignedManagerObjAuthId === candidate ||
      eventAuthId === candidate ||
      (String(assignedManagerId) === String(candidate))
    ));

    const coreStaffList = event.coreStaffIds ?? (event as any).staffIds ?? [];
    const matchCoreStaff = Array.isArray(coreStaffList) && coreStaffList.some((id) =>
      candidates.some((candidate) => String(id) === String(candidate))
    );

    return matchAssigned || matchCoreStaff;
  });

  return sortByDate(dedupeByEventId([...managerEvents, ...assigned, ...promoteEvents]));
};

export const getPromoteEventById = async (token: string, eventId: string) => {
  const response = await request<ApiEnvelope<ManagerEventsPayload>>(
    "/api/events/promote/manager/events?limit=200",
    { token }
  );

  const events = response.data?.events ?? [];
  const match = events.find((item) => String((item as any).eventId ?? (item as any)._id ?? "") === eventId);
  return match ? toPlanningLike(match as PromoteEvent) : null;
};

export const getCoordinatorEventById = async (
  token: string,
  eventId: string,
  source?: "planning" | "promote"
): Promise<PlanningEvent> => {
  if (source === "promote") {
    const promote = await getPromoteEventById(token, eventId);
    if (promote) return promote;
  }

  try {
    const planning = await getPlanningEventById(token, eventId);
    return { ...planning, eventSource: "planning" };
  } catch {
    // fall through
  }

  const promote = await getPromoteEventById(token, eventId);
  if (promote) return promote;

  throw new Error("Planning not found");
};

export const getPlanningEventById = async (token: string, eventId: string) => {
  const response = await request<ApiEnvelope<PlanningEvent>>(
    `/api/events/planning/${encodeURIComponent(eventId)}`,
    { token }
  );

  return response.data;
};

export const verifyTicketQr = async (token: string, qrToken: string) => {
  const response = await request<ApiEnvelope<QrVerificationResult>>(
    "/api/events/tickets/verify-qr",
    {
      method: "POST",
      token,
      body: { token: qrToken },
    }
  );

  return response.data;
};

export const getEventTicketGuests = async (token: string, eventId: string) => {
  const response = await request<ApiEnvelope<any>>(`/api/events/tickets/events/${encodeURIComponent(eventId)}/guests?limit=500`, { token });
  const data = response.data;
  return (data?.guests || data?.items || data?.tickets || (Array.isArray(data) ? data : [])) as EventTicketGuest[];
};

export const splitCurrentAndUpcomingEvents = (events: PlanningEvent[]) => {
  const now = new Date();
  const current: PlanningEvent[] = [];
  const upcoming: PlanningEvent[] = [];

  for (const event of events) {
    const startDate = getStartDate(event);
    const endDate = getEndDate(event);

    if (!startDate) {
      continue;
    }

    if (startDate.getTime() > now.getTime()) {
      upcoming.push(event);
      continue;
    }

    if (endDate && endDate.getTime() < now.getTime()) {
      continue;
    }

    current.push(event);
  }

  return {
    current: sortByDate(current),
    upcoming: sortByDate(upcoming),
  };
};
