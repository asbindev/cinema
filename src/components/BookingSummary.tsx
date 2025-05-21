
'use client';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentBooking, Seat, BookingFormState } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle, Edit3, RotateCcw } from 'lucide-react';

interface BookingSummaryProps {
  currentBooking: CurrentBooking | null;
  pendingSeats: Seat[] | null; // Seats suggested by AI, user is reviewing
  adminSelectedSeats: Seat[] | null; // Seats selected by admin directly
  isAdminMode: boolean;
  onCancelConfirmedBooking: () => void;
  onConfirmAdminBooking: () => void; // For direct admin booking without AI step
  onClearPendingOrAdminSelection: () => void;
  onConfirmPendingBooking: () => void;
  isReviewingAiSuggestion: boolean;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  currentBooking,
  pendingSeats,
  adminSelectedSeats,
  isAdminMode,
  onCancelConfirmedBooking,
  onConfirmAdminBooking,
  onClearPendingOrAdminSelection,
  onConfirmPendingBooking,
  isReviewingAiSuggestion,
}) => {
  if (currentBooking) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
            Booking Confirmed!
          </CardTitle>
          <CardDescription>ID: {currentBooking.id.substring(0, 8)}... | Group: {currentBooking.groupSize}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-medium mb-2">Booked Seats:</p>
          <div className="flex flex-wrap gap-2">
            {currentBooking.bookedSeats.map(seat => (
              <Badge key={seat.id} variant="default" className="bg-primary text-primary-foreground">{seat.id}</Badge>
            ))}
          </div>
          {currentBooking.requiresAccessibleSeating && <p className="text-sm mt-2 text-primary">Accessible seating requested.</p>}
          {currentBooking.wantsVipSeating && <p className="text-sm mt-1 text-primary">VIP seating preferred.</p>}
          {currentBooking.seniorCitizen && <p className="text-sm mt-1 text-primary">Senior citizen booking.</p>}
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={onCancelConfirmedBooking} className="w-full">
            <XCircle className="mr-2 h-4 w-4" />
            Cancel This Booking (Local)
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isReviewingAiSuggestion && pendingSeats) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit3 className="mr-2 h-6 w-6 text-accent" />
            Review & Confirm Seats
          </CardTitle>
          <CardDescription>AI suggested seats. Modify on chart if needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-medium mb-2">Selected Seats ({pendingSeats.length}):</p>
          {pendingSeats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pendingSeats.map(seat => (
                <Badge key={seat.id} variant="secondary">{seat.id}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No seats currently selected.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <Button variant="outline" onClick={onClearPendingOrAdminSelection} className="w-full sm:w-auto">
             <RotateCcw className="mr-2 h-4 w-4" /> Clear / Change Criteria
          </Button>
          <Button onClick={onConfirmPendingBooking} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={pendingSeats.length === 0}>
            <CheckCircle className="mr-2 h-4 w-4" /> Confirm Booking
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (isAdminMode && adminSelectedSeats) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit3 className="mr-2 h-6 w-6 text-primary" />
            Admin Seat Selection
          </CardTitle>
          <CardDescription>Manually selected seats.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-medium mb-2">Selected Seats ({adminSelectedSeats.length}):</p>
          {adminSelectedSeats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {adminSelectedSeats.map(seat => (
                <Badge key={seat.id} variant="outline">{seat.id}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No seats currently selected by admin.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
           <Button variant="outline" onClick={onClearPendingOrAdminSelection} className="w-full sm:w-auto">
             <RotateCcw className="mr-2 h-4 w-4" /> Clear Selection
          </Button>
          <Button onClick={onConfirmAdminBooking} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={adminSelectedSeats.length === 0}>
            <CheckCircle className="mr-2 h-4 w-4" /> Confirm Admin Booking
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Default state: No active booking, no pending AI suggestion, not in admin manual selection mode
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Booking Status</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
            {isAdminMode ? "Admin mode active. Select seats on the chart or use the form for AI suggestions." : "Use the form above to find seats with AI."}
        </p>
      </CardContent>
    </Card>
  );
};

    