import type { Seat, SeatLayoutConfig, SeatCategory, SeatStatus } from './types';

const DEFAULT_AISLE_AFTER_SEAT = 4; // Create an aisle after seat number 4 (0-indexed)

export function generateInitialSeats(config: SeatLayoutConfig): Seat[] {
  const seats: Seat[] = [];
  const totalSeats = config.rows * config.seatsPerRow;
  const brokenSeatIndices = new Set<number>();

  // Randomly mark 5 seats as broken
  while (brokenSeatIndices.size < 5) {
    const randomIndex = Math.floor(Math.random() * totalSeats);
    brokenSeatIndices.add(randomIndex);
  }

  let seatIndex = 0;
  for (let i = 0; i < config.rows; i++) {
    const rowLabel = String.fromCharCode(65 + i); // A, B, C...
    for (let j = 0; j < config.seatsPerRow; j++) {
      const seatId = `${rowLabel}${j + 1}`;
      let category: SeatCategory = 'regular';
      let ageRestriction: number | undefined = undefined;

      if (config.vipRows?.includes(i)) {
        category = 'vip';
      }
      if (config.accessibleSeats?.some(as => as.row === i && as.seat === j)) {
        category = 'accessible';
      }
      const ageRestrictedRowConfig = config.ageRestrictedRows?.find(ar => ar.row === i);
      if (ageRestrictedRowConfig) {
        category = 'ageRestricted';
        ageRestriction = ageRestrictedRowConfig.minAge;
      }

      const status: SeatStatus = brokenSeatIndices.has(seatIndex) ? 'broken' : 'available';

      seats.push({
        id: seatId,
        row: rowLabel,
        number: j + 1,
        status,
        category,
        ageRestriction,
        isSelected: false,
      });
      seatIndex++;
    }
  }
  return seats;
}

export const defaultSeatLayoutConfig: SeatLayoutConfig = {
  rows: 8, // A-H
  seatsPerRow: 10, // 1-10
  vipRows: [3, 4], // Rows D, E (0-indexed)
  accessibleSeats: [ // Example accessible seats
    { row: 0, seat: 0 }, { row: 0, seat: 9 }, // A1, A10
    { row: 7, seat: 0 }, { row: 7, seat: 9 }, // H1, H10
  ],
  ageRestrictedRows: [
    { row: 6, minAge: 15 }, // Row G (15+)
    { row: 7, minAge: 18 }, // Row H (18+)
  ],
};

export function getSeatRowLabel(rowIndex: number): string {
  return String.fromCharCode(65 + rowIndex);
}

export function getAisleAfterSeat(config: SeatLayoutConfig): number {
    // Example: if seatsPerRow is 10, aisle might be after seat 5.
    // This is a simple example, real halls have complex aisle patterns.
    return Math.floor(config.seatsPerRow / 2) -1;
}

