
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { SeatingChart } from '@/components/SeatingChart';
import { BookingForm } from '@/components/BookingForm';
import { AdminControls } from '@/components/AdminControls';
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateInitialSeats, defaultSeatLayoutConfig } from '@/lib/seat-utils';
import type { Seat, BookingFormState, CurrentBooking, SeatLayoutConfig, AuthUser, Movie, NewBookingPayload } from '@/lib/types';
import { handleSeatAllocation } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CheckSquare, XSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';


interface BookingSystemProps {
  movie?: Movie | null; 
}

export const BookingSystem: React.FC<BookingSystemProps> = ({ movie }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [seatLayoutConfig] = useState<SeatLayoutConfig>(defaultSeatLayoutConfig);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [userSelectedSeatIds, setUserSelectedSeatIds] = useState<string[]>([]);
  const [currentBooking, setCurrentBooking] = useState<CurrentBooking | null>(null);
  const [isLocalAdminMode, setIsLocalAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [pendingBookingDetails, setPendingBookingDetails] = useState<BookingFormState | null>(null);

  const authUser = session?.user as AuthUser | undefined;

  const initializeSeats = useCallback(() => {
    const initialSeats = generateInitialSeats(seatLayoutConfig);
    setSeats(initialSeats);
    setCurrentBooking(null);
    setUserSelectedSeatIds([]);
    setPendingBookingDetails(null);
    if (seats.length > 0) {
        toast({ title: "Seat layout reset", description: "New random broken seats generated." });
    }
  }, [seatLayoutConfig, toast, seats.length]);

  useEffect(() => {
    initializeSeats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleSeatClick = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status === 'broken') {
      toast({ variant: "destructive", title: "Invalid Seat", description: "This seat is broken."});
      return;
    }
    if (seat.status === 'booked' && !(isLocalAdminMode && currentBooking?.bookedSeats.some(s => s.id === seatId))) { // Allow admin to deselect their own "booked" seats if cancelling
      toast({ variant: "destructive", title: "Seat Unavailable", description: "This seat is already booked."});
      return;
    }

    // Allow selection/deselection if:
    // 1. Admin mode is on (for creating new admin booking) OR
    // 2. AI has made suggestions (pendingBookingDetails is not null)
    if (isLocalAdminMode && !pendingBookingDetails && !currentBooking || pendingBookingDetails) {
        setUserSelectedSeatIds(prevSelected =>
        prevSelected.includes(seatId)
            ? prevSelected.filter(id => id !== seatId)
            : [...prevSelected, seatId]
        );
    } else {
        toast({ title: "Info", description: "Use the booking form to find seats or enable admin mode for manual selection."});
    }
  };

  const saveBookingToDb = async (
    allocatedSeatIds: string[],
    bookingDetails: BookingFormState
  ): Promise<string | null> => {
    if (!movie) {
      toast({ variant: "destructive", title: "Booking Error", description: "Movie information is missing." });
      return null;
    }
    if (allocatedSeatIds.length === 0) {
      toast({ variant: "destructive", title: "Booking Error", description: "No seats selected for booking." });
      return null;
    }

    const payload: NewBookingPayload = {
      movieId: movie.id,
      movieTitle: movie.title,
      seatIds: allocatedSeatIds,
      groupSize: bookingDetails.groupSize,
      preferences: bookingDetails,
      userEmail: authUser?.email,
      userId: authUser?.id
    };

    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save booking to database');
      }
      const savedBooking = await response.json();
      return savedBooking.id; 
    } catch (error) {
      toast({ variant: "destructive", title: "Database Error", description: (error as Error).message });
      return null;
    } finally {
        setIsLoading(false);
    }
  };

  const processAiBookingRequest = async (bookingDetails: BookingFormState) => {
    if (currentBooking) {
      toast({ variant: "destructive", title: "Existing Booking", description: "Please cancel the current confirmed booking before making a new one." });
      return;
    }
    setIsLoading(true);
    try {
        const result = await handleSeatAllocation(seats, bookingDetails);
        const uniqueAllocatedSeatIds = result.allocatedSeatIds && Array.isArray(result.allocatedSeatIds)
                                          ? Array.from(new Set(result.allocatedSeatIds))
                                          : [];

        if (uniqueAllocatedSeatIds.length > 0) {
            setPendingBookingDetails(bookingDetails);
            setUserSelectedSeatIds(uniqueAllocatedSeatIds); // AI suggestions become the current selection
            toast({ title: "AI Suggestion", description: result.message || `${uniqueAllocatedSeatIds.length} seats suggested. Review and confirm.` });
        } else {
            toast({ variant: "destructive", title: "AI Booking Failed", description: result.message || "No seats were allocated by AI." });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "AI Booking Error", description: (error as Error).message || "An unexpected error occurred with AI." });
    } finally {
        setIsLoading(false);
    }
  };

  const handleConfirmFinalBooking = async () => {
    if (!pendingBookingDetails || userSelectedSeatIds.length === 0) {
        toast({ variant: "destructive", title: "Confirmation Error", description: "No pending booking or seats selected to confirm." });
        return;
    }
    
    const dbBookingId = await saveBookingToDb(userSelectedSeatIds, pendingBookingDetails);
    if (dbBookingId) {
        const confirmedSeatsForSummary: Seat[] = [];
        userSelectedSeatIds.forEach(idToBook => {
            const originalSeat = seats.find(s => s.id === idToBook);
            if (originalSeat) {
                confirmedSeatsForSummary.push({ ...originalSeat, status: 'booked' });
            }
        });
        confirmedSeatsForSummary.sort((a, b) => a.id.localeCompare(b.id));

        setSeats(prevSeats =>
            prevSeats.map(s => userSelectedSeatIds.includes(s.id) ? { ...s, status: 'booked', isSelected: false } : s)
        );
        setCurrentBooking({
            id: dbBookingId,
            bookedSeats: confirmedSeatsForSummary,
            ...pendingBookingDetails,
        });
        setPendingBookingDetails(null);
        setUserSelectedSeatIds([]);
        toast({ title: "Booking Confirmed!", description: `${confirmedSeatsForSummary.length} seats successfully booked.` });
    }
  };
  
  const handleAdminBookingConfirm = async () => {
    if (!isLocalAdminMode || userSelectedSeatIds.length === 0) return;

    const adminBookingDetails: BookingFormState = {
        groupSize: userSelectedSeatIds.length,
        requiresAccessibleSeating: false,
        wantsVipSeating: false,
        seniorCitizen: false,
    };
    
    const dbBookingId = await saveBookingToDb(userSelectedSeatIds, adminBookingDetails);
    if (dbBookingId) {
        const adminBookedSeatsForSummary: Seat[] = [];
        userSelectedSeatIds.forEach(idToBook => {
            const originalSeat = seats.find(s => s.id === idToBook);
            if (originalSeat) {
                adminBookedSeatsForSummary.push({ ...originalSeat, status: 'booked' });
            }
        });
        adminBookedSeatsForSummary.sort((a, b) => a.id.localeCompare(b.id));

        setSeats(prevSeats =>
          prevSeats.map(s => userSelectedSeatIds.includes(s.id) ? { ...s, status: 'booked', isSelected: false } : s)
        );
        setCurrentBooking({
          id: dbBookingId,
          bookedSeats: adminBookedSeatsForSummary,
          ...adminBookingDetails,
        });
        setUserSelectedSeatIds([]);
        toast({ title: "Admin Booking Confirmed", description: `${adminBookedSeatsForSummary.length} seats booked and saved.` });
    }
  };

  const handleCancelCurrentBooking = () => { // For confirmed bookings
    if (!currentBooking) return;
    setSeats(prevSeats =>
      prevSeats.map(s =>
        currentBooking.bookedSeats.find(bs => bs.id === s.id)
          ? { ...s, status: 'available', isSelected: false }
          : s
      )
    );
    setCurrentBooking(null);
    toast({ title: "Confirmed Booking Cancelled (Locally)", description: "Seats are available again on this chart. The booking might still exist in the database if not handled by a dedicated cancellation API." });
  };

  const handleClearPendingOrAdminSelection = () => {
    setPendingBookingDetails(null);
    setUserSelectedSeatIds([]);
    toast({title: "Selection Cleared", description: "AI suggestions or admin selection has been cleared."});
  };

  const toggleLocalAdminMode = (isAdmin: boolean) => {
    setIsLocalAdminMode(isAdmin);
    setUserSelectedSeatIds([]); // Clear selections when toggling mode
    if (currentBooking && !isAdmin) handleCancelCurrentBooking(); 
    if (pendingBookingDetails && !isAdmin) handleClearPendingOrAdminSelection();

    if (isAdmin) {
      toast({title: "Local Admin Mode Enabled", description: "Seating rules can be bypassed."});
    } else {
      toast({title: "Local Admin Mode Disabled"});
    }
  };

  const canUseAdminControls = authUser?.role === 'admin';
  const isReviewingAiSuggestion = !!pendingBookingDetails;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="flex justify-end mb-4">
            <Button onClick={initializeSeats} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4"/> Reset Seats
            </Button>
        </div>
        {seats.length > 0 ? (
            <SeatingChart
            seats={seats}
            config={seatLayoutConfig}
            onSeatClick={handleSeatClick}
            selectedSeatIds={userSelectedSeatIds}
            disabled={isLoading || (!!currentBooking && !isLocalAdminMode)} // Disable chart if booking confirmed (unless admin)
            />
        ) : (
        <p>Loading seating chart...</p>
        )}
      </div>

      <aside className="lg:col-span-1 space-y-6 order-1 lg:order-2">
        {canUseAdminControls && (
          <AdminControls isAdminMode={isLocalAdminMode} onToggleAdminMode={toggleLocalAdminMode} />
        )}
        <Separator />

        {!isReviewingAiSuggestion && !currentBooking && !isLocalAdminMode && (
          <BookingForm onSubmit={processAiBookingRequest} isLoading={isLoading} defaultValues={pendingBookingDetails || undefined} />
        )}

        {isReviewingAiSuggestion && !currentBooking && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Review Your Selection</CardTitle>
                    <CardDescription>
                        AI has suggested seats. You can modify the selection on the chart.
                        Seats selected: {userSelectedSeatIds.join(', ') || 'None'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">Group Size: {pendingBookingDetails?.groupSize}</p>
                    {pendingBookingDetails?.requiresAccessibleSeating && <p className="text-sm text-primary">Accessible seating requested.</p>}
                    {pendingBookingDetails?.wantsVipSeating && <p className="text-sm text-primary">VIP seating preferred.</p>}
                    {pendingBookingDetails?.seniorCitizen && <p className="text-sm text-primary">Senior citizen booking.</p>}
                 </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button onClick={handleConfirmFinalBooking} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || userSelectedSeatIds.length === 0}>
                        <CheckSquare className="mr-2 h-4 w-4" /> Confirm Booking
                    </Button>
                    <Button variant="outline" onClick={handleClearPendingOrAdminSelection} className="w-full" disabled={isLoading}>
                        <XSquare className="mr-2 h-4 w-4" /> Clear Selection / Change Criteria
                    </Button>
                </CardFooter>
            </Card>
        )}
        
        {isLocalAdminMode && !pendingBookingDetails && !currentBooking && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Admin Seat Selection</CardTitle>
                    <CardDescription>
                        Select seats directly on the chart. Seats selected: {userSelectedSeatIds.join(', ') || 'None'}
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={handleAdminBookingConfirm} className="w-full" disabled={isLoading || userSelectedSeatIds.length === 0}>
                        <CheckSquare className="mr-2 h-4 w-4" /> Confirm Admin Booking
                    </Button>
                </CardFooter>
            </Card>
        )}


        <Separator />
        <BookingSummary
            currentBooking={currentBooking}
            pendingSeats={isReviewingAiSuggestion ? seats.filter(s => userSelectedSeatIds.includes(s.id)) : null}
            adminSelectedSeats={isLocalAdminMode && !isReviewingAiSuggestion && !currentBooking ? seats.filter(s => userSelectedSeatIds.includes(s.id)) : null}
            isAdminMode={isLocalAdminMode && canUseAdminControls}
            onCancelConfirmedBooking={handleCancelCurrentBooking}
            onConfirmAdminBooking={handleAdminBookingConfirm} // This button is now primarily for direct admin booking
            onClearPendingOrAdminSelection={handleClearPendingOrAdminSelection}
            onConfirmPendingBooking={handleConfirmFinalBooking}
            isReviewingAiSuggestion={isReviewingAiSuggestion}
        />
      </aside>
    </div>
  );
};

    