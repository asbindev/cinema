
export type SeatStatus = 'available' | 'selected' | 'booked' | 'broken';
export type SeatCategory = 'regular' | 'vip' | 'accessible' | 'ageRestricted' | 'senior';

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
  displayText?: string; // Text to display on the seat (e.g., VIP, D1)
}

export interface BookingFormState {
  groupSize: number;
  requiresAccessibleSeating: boolean;
  wantsVipSeating: boolean;
  ageOfYoungestMember?: number;
  seniorCitizen: boolean;
}

export interface CurrentBooking extends BookingFormState {
  id: string; // This will be the bookingId from the database
  bookedSeats: Seat[]; // UI Seat objects
}

export interface SeatLayoutConfig {
  rows: number;
  seatsPerRow: number;
  vipRows?: number[]; // e.g. [4, 5] for rows E, F
  accessibleSeats?: { row: number, seat: number }[]; // 0-indexed
  ageRestrictedRows?: { row: number, minAge: number }[]; // e.g. [{row: 9, minAge: 18}] for row J
  seniorSeats?: { row: number, seat: number }[]; // Specific seats designated for seniors
}

export interface AIAllocationResult {
  allocatedSeatIds?: string[];
  message: string;
  error?: string;
}

// Movie types
export interface Movie {
  id: number;
  title: string;
  description?: string;
  posterUrl?: string;
  duration?: number; // in minutes
  createdAt?: string;
  updatedAt?: string;
}

export interface MovieFormData {
  title: string;
  description?: string;
  posterUrl?: string;
  duration?: number;
}

// User and Auth types
export interface User { // Represents a user in the database
  id: number;
  name?: string | null;
  email: string;
  role: 'user' | 'admin';
  hashedPassword?: string; 
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser { // Represents the authenticated user in session/token
  id: string; // From NextAuth, usually string representation of DB ID
  name?: string | null;
  email: string;
  role: 'user' | 'admin';
}

// Booking types
// Client sends this payload. userId and userEmail are derived from session server-side.
export interface NewBookingPayload {
  movieId: number;
  movieTitle: string;
  seatIds: string[];
  groupSize: number;
  preferences: BookingFormState;
}

export interface BookingEntry { // Represents a full booking record from the DB
  id: string; // UUID from database
  movieId: number;
  movieTitle: string;
  userId: number; // Stored as number in DB, now NOT NULL
  userEmail: string; // Stored in DB from session
  seatIds: string[]; // Parsed from JSON
  groupSize: number;
  preferences: BookingFormState; // Parsed from JSON
  bookingTime: string; // ISO date string
}

