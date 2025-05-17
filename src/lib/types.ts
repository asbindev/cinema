
export type SeatStatus = 'available' | 'selected' | 'booked' | 'broken';
export type SeatCategory = 'regular' | 'vip' | 'accessible' | 'ageRestricted';

// Corresponds to the AI flow's SeatSchema
export interface AISMSeat {
  seatNumber: string;
  type: SeatCategory;
  isAvailable: boolean;
  isBroken: boolean;
  ageRestriction?: number;
}
export interface Seat {
  id: string; // e.g., "A1", "B5"
  row: string;
  number: number;
  status: SeatStatus;
  category: SeatCategory;
  ageRestriction?: number; // e.g., 18 for 18+
  isSelected?: boolean; // For UI selection, especially admin mode
}

export interface BookingFormState {
  groupSize: number;
  requiresAccessibleSeating: boolean;
  wantsVipSeating: boolean;
  ageOfYoungestMember?: number;
  seniorCitizen: boolean;
}

export interface CurrentBooking extends BookingFormState {
  id: string;
  bookedSeats: Seat[];
}

export interface SeatLayoutConfig {
  rows: number;
  seatsPerRow: number;
  vipRows?: number[]; // e.g. [4, 5] for rows E, F
  accessibleSeats?: { row: number, seat: number }[]; // 0-indexed
  ageRestrictedRows?: { row: number, minAge: number }[]; // e.g. [{row: 9, minAge: 18}] for row J
}

export interface AIAllocationResult {
  allocatedSeatIds?: string[];
  message: string;
  error?: string;
}
