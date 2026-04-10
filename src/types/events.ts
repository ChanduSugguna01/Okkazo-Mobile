export interface EventSchedule {
  startAt?: string | null;
  endAt?: string | null;
}

export interface EventLocation {
  name?: string;
  latitude?: number;
  longitude?: number;
}

export interface TicketTier {
  name: string;
  noOfTickets: number;
  price: number;
}

export interface PlanningEvent {
  eventId: string;
  eventTitle?: string;
  category?: string;
  status?: string;
  authId?: string;
  assignedManagerId?: string | null;
  coreStaffIds?: string[];
  eventDescription?: string;
  eventDate?: string | null;
  schedule?: EventSchedule;
  location?: EventLocation;
  selectedServices?: string[];
  eventField?: string | null;
}

export interface QrVerificationResult {
  valid: boolean;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventSource: string;
  ticketStatus: string;
  quantity: number;
  tiers: TicketTier[];
  paidAt: string | null;
  scannedAt: string;
}

export interface EventTicketGuest {
  ticketId: string;
  userAuthId: string;
  guestName?: string;
  guestEmail?: string;
  ticketStatus: string;
  verification?: {
    status: string;
    verifiedAt: string | null;
    lastScannedAt: string | null;
    scanCount: number;
    scanHistory: any[];
  };
  tickets: {
    ticketType: string;
    noOfTickets: number;
    tiers: TicketTier[];
  };
}
