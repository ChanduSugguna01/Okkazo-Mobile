import { request } from "@/src/lib/api";
import { ApiEnvelope } from "@/src/types/auth";
import { PlanningEvent, QrVerificationResult } from "@/src/types/events";

interface ManagerEventsPayload {
  events: PlanningEvent[];
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
    if (!item?.eventId) {
      continue;
    }

    map.set(item.eventId, item);
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

export const getCoordinatorEvents = async (token: string, managerUserId?: string | null) => {
  const managerResponse = await request<ApiEnvelope<ManagerEventsPayload>>(
    "/api/events/planning/manager/events?limit=200",
    { token }
  );

  const managerEvents = managerResponse.data?.events ?? [];

  let allPlanningEvents: PlanningEvent[] = [];
  try {
    const response = await request<ApiEnvelope<PlanningEvent[]>>(
      "/api/events/planning?limit=200",
      { token }
    );
    allPlanningEvents = Array.isArray(response.data) ? response.data : [];
  } catch {
    allPlanningEvents = [];
  }

  if (!managerUserId) {
    return sortByDate(dedupeByEventId(managerEvents));
  }

  const assigned = allPlanningEvents.filter((event) => {
    const isAssignedManager = event.assignedManagerId === managerUserId;
    const isCoreStaff = (event.coreStaffIds ?? []).includes(managerUserId);
    return isAssignedManager || isCoreStaff;
  });

  return sortByDate(dedupeByEventId([...managerEvents, ...assigned]));
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
