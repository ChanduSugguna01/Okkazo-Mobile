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
  eventSource?: "planning" | "promote";
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
  alreadyScanned?: boolean;
  message?: string;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventSource: string;
  ticketStatus: string;
  verificationStatus?: string;
  quantity: number;
  tiers: TicketTier[];
  selectedDay?: string | null;
  paidAt: string | null;
  verifiedAt?: string;
  lastScannedAt?: string;
  scanCount?: number;
  scannedByAuthId?: string | null;
  scannedByRole?: string | null;
  scanHistory?: Array<{
    scannedAt: string;
    scannedByAuthId: string | null;
    scannedByRole: string | null;
    outcome: string;
  }>;
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
