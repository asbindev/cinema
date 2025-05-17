'use client';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentBooking, Seat } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle } from 'lucide-react';

interface BookingSummaryProps {
  currentBooking: CurrentBooking | null;
  selectedSeats: Seat[]; // Changed from selectedSeatsForAdmin to selectedSeats
  isAdminMode: boolean;
  onCancelBooking: () => void;
  onConfirmAdminBooking: () => void;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  currentBooking,
  selectedSeats, // Changed from selectedSeatsForAdmin
  isAdminMode,
  onCancelBooking,
  onConfirmAdminBooking,
}) => {
  if (!currentBooking && (!isAdminMode || selectedSeats.length === 0)) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Booking Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active booking or selection.</p>
        </CardContent>
      </Card>
    );
  }

  const seatsToDisplay = currentBooking ? currentBooking.bookedSeats : selectedSeats;
  const title = currentBooking ? `Booking ID: ${currentBooking.id.substring(0,8)}...` : "Admin Selection";
  const description = currentBooking ? `Group of ${currentBooking.groupSize}` : `${selectedSeats.length} seat(s) selected`;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-medium mb-2">Seats:</p>
        {seatsToDisplay.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {seatsToDisplay.map(seat => (
              <Badge key={seat.id} variant="secondary">{seat.id}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No seats allocated yet.</p>
        )}
        {currentBooking?.requiresAccessibleSeating && <p className="text-sm mt-2 text-primary">Accessible seating requested.</p>}
        {currentBooking?.wantsVipSeating && <p className="text-sm mt-1 text-primary">VIP seating preferred.</p>}
        {currentBooking?.seniorCitizen && <p className="text-sm mt-1 text-primary">Senior citizen booking.</p>}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
        {currentBooking && (
          <Button variant="destructive" onClick={onCancelBooking} className="w-full sm:w-auto">
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Booking
          </Button>
        )}
        {isAdminMode && selectedSeats.length > 0 && !currentBooking && (
          <Button onClick={onConfirmAdminBooking} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirm Admin Booking
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
