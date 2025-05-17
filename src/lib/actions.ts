'use server';
import { optimizeSeatingAllocation, type OptimizeSeatingAllocationInput } from '@/ai/flows/optimize-seating-allocation';
import type { Seat, AISMSeat, BookingFormState, AIAllocationResult } from './types';

function mapUiSeatsToAiSeats(uiSeats: Seat[], bookingDetails: BookingFormState): OptimizeSeatingAllocationInput['seats'] {
  return uiSeats.map(seat => ({
    seatNumber: seat.id,
    type: seat.category,
    isAvailable: seat.status === 'available',
    isBroken: seat.status === 'broken',
    ageRestriction: seat.ageRestriction,
  }));
}

export async function handleSeatAllocation(
  currentSeats: Seat[],
  bookingDetails: BookingFormState
): Promise<AIAllocationResult> {
  try {
    const aiSeatsInput = mapUiSeatsToAiSeats(currentSeats, bookingDetails);

    const aiInput: OptimizeSeatingAllocationInput = {
      seats: aiSeatsInput,
      groupSize: bookingDetails.groupSize,
      requiresAccessibleSeating: bookingDetails.requiresAccessibleSeating,
      wantsVipSeating: bookingDetails.wantsVipSeating,
      ageOfYoungestMember: bookingDetails.ageOfYoungestMember,
      seniorCitizen: bookingDetails.seniorCitizen,
    };

    const result = await optimizeSeatingAllocation(aiInput);

    if (result.allocatedSeats && result.allocatedSeats.length > 0) {
      return {
        allocatedSeatIds: result.allocatedSeats,
        message: result.message || "Seats allocated successfully.",
      };
    } else {
      return {
        message: result.message || "Could not allocate seats. Please try different criteria or contact support.",
        error: "Allocation failed",
      };
    }
  } catch (error) {
    console.error("Error in AI seat allocation:", error);
    return {
      message: "An unexpected error occurred during seat allocation.",
      error: (error instanceof Error) ? error.message : "Unknown error",
    };
  }
}
