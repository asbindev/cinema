'use server';

/**
 * @fileOverview AI-powered seat allocation optimization.
 *
 * This file defines a Genkit flow that dynamically optimizes seat allocation
 * based on various constraints such as group sizes, unavailable seats, seating
 * preferences, and zone restrictions (VIP, accessible, age-restricted).
 *
 * - optimizeSeatingAllocation - The main function to trigger seat allocation.
 * - OptimizeSeatingAllocationInput - Input type for seat allocation parameters.
 * - OptimizeSeatingAllocationOutput - Output type representing the optimal seat allocation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SeatSchema = z.object({
  seatNumber: z.string().describe('Unique identifier for the seat (e.g., A1, B2).'),
  type: z.enum(['regular', 'vip', 'accessible', 'ageRestricted']).describe('Type of seat.'),
  isAvailable: z.boolean().describe('Indicates if the seat is currently available.'),
  isBroken: z.boolean().describe('Indicates if the seat is broken and unavailable.'),
  ageRestriction: z.number().optional().describe('Minimum age for age-restricted seats.'),
});

export type Seat = z.infer<typeof SeatSchema>;

const OptimizeSeatingAllocationInputSchema = z.object({
  seats: z.array(SeatSchema).describe('Array of available seats with their details.'),
  groupSize: z.number().describe('The number of people in the group to be seated.'),
  requiresAccessibleSeating: z.boolean().describe('Whether the group requires accessible seating.'),
  wantsVipSeating: z.boolean().describe('Whether the group prefers VIP seating.'),
  ageOfYoungestMember: z.number().optional().describe('Age of the youngest member of the group, if any.'),
  seniorCitizen: z.boolean().describe('Whether the member is a senior citizen.'),
});

export type OptimizeSeatingAllocationInput = z.infer<
  typeof OptimizeSeatingAllocationInputSchema
>;

const OptimizeSeatingAllocationOutputSchema = z.object({
  allocatedSeats: z
    .array(z.string())
    .describe('Array of seat numbers that have been allocated to the group.'),
  message: z.string().describe('A message indicating the success or reason for failure.'),
});

export type OptimizeSeatingAllocationOutput = z.infer<
  typeof OptimizeSeatingAllocationOutputSchema
>;

export async function optimizeSeatingAllocation(
  input: OptimizeSeatingAllocationInput
): Promise<OptimizeSeatingAllocationOutput> {
  return optimizeSeatingAllocationFlow(input);
}

const optimizeSeatingAllocationPrompt = ai.definePrompt({
  name: 'optimizeSeatingAllocationPrompt',
  input: {schema: OptimizeSeatingAllocationInputSchema},
  output: {schema: OptimizeSeatingAllocationOutputSchema},
  prompt: `You are an AI seating optimization expert for a movie hall.

You will receive a list of available seats, the size of the group needing seats, and any special requirements or preferences they have (accessibility, VIP, age restrictions).

Based on this information, you will determine the best possible seat allocation for the group, taking into account the following constraints:

*   Groups should be seated together whenever possible.
*   Unavailable or broken seats should not be allocated.
*   If accessibility is required, seats must be accessible.
*   If VIP seating is preferred, allocate VIP seats if available.
*   Adhere to age restrictions - no children in age-restricted zones.
*   Senior citizens should be seated where they want, ignoring any restrictions.

Return the seat numbers of the allocated seats, and a message indicating whether the allocation was successful and why.

Here is the seating information:

Seats: {{#each seats}}{{{this.seatNumber}}} (Type: {{{this.type}}}, Available: {{{this.isAvailable}}}, Broken: {{{this.isBroken}}}, Age Restriction: {{{this.ageRestriction}}}){{/each}}
Group Size: {{{groupSize}}}
Requires Accessible Seating: {{{requiresAccessibleSeating}}}
Wants VIP Seating: {{{wantsVipSeating}}}
Age of Youngest Member: {{{ageOfYoungestMember}}}
Senior Citizen: {{{seniorCitizen}}}

Output in JSON format:
${JSON.stringify(OptimizeSeatingAllocationOutputSchema.shape)}`,
});

const optimizeSeatingAllocationFlow = ai.defineFlow(
  {
    name: 'optimizeSeatingAllocationFlow',
    inputSchema: OptimizeSeatingAllocationInputSchema,
    outputSchema: OptimizeSeatingAllocationOutputSchema,
  },
  async input => {
    const {output} = await optimizeSeatingAllocationPrompt(input);
    return output!;
  }
);
