
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { SeatingChart } from '@/components/SeatingChart';
import { BookingForm } from '@/components/BookingForm';
import { AdminControls } from '@/components/AdminControls';
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateInitialSeats, defaultSeatLayoutConfig } from '@/lib/seat-utils';
import type { Seat, BookingFormState, CurrentBooking, SeatLayoutConfig, AuthUser, Movie, NewBookingPayload, BookingEntry } from '@/lib/types';
import { handleSeatAllocation } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CheckSquare, XSquare, AlertTriangle, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';


interface BookingSystemProps {
  movie?: Movie | null;
}

interface SelectionValidationResult {
  isValid: boolean;
  message: string;
}

export const BookingSystem: React.FC<BookingSystemProps> = ({ movie }) => {
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const [seatLayoutConfig] = useState<SeatLayoutConfig>(defaultSeatLayoutConfig);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [userSelectedSeatIds, setUserSelectedSeatIds] = useState<string[]>([]);
  const [currentBooking, setCurrentBooking] = useState<CurrentBooking | null>(null);
  const [isLocalAdminMode, setIsLocalAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [pendingBookingDetails, setPendingBookingDetails] = useState<BookingFormState | null>(null);
  const [selectionValidation, setSelectionValidation] = useState<SelectionValidationResult>({ isValid: false, message: '' });

  const authUser = session?.user as AuthUser | undefined;
  const isAuthenticated = sessionStatus === 'authenticated' && !!authUser;

  const initializeSeats = useCallback(() => {
    const initialSeats = generateInitialSeats(seatLayoutConfig);
    setSeats(initialSeats);
    setCurrentBooking(null);
    setUserSelectedSeatIds([]);
    setPendingBookingDetails(null);
    setSelectionValidation({ isValid: false, message: '' });
    if (seats.length > 0) {
        // toast({ title: "Seat layout reset", description: "New random broken seats generated." });
    }
  }, [seatLayoutConfig, seats.length]);

  useEffect(() => {
    initializeSeats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once on mount

  const getSelectionValidation = useCallback((
    selectedIds: string[],
    details: BookingFormState | null,
    allSeats: Seat[]
  ): SelectionValidationResult => {
    if (!details) return { isValid: false, message: "Booking details not available." };

    if (selectedIds.length === 0 && details.groupSize > 0) {
      return { isValid: false, message: `Please select ${details.groupSize} seat(s).` };
    }
    if (selectedIds.length !== details.groupSize) {
      return { isValid: false, message: `Please select exactly ${details.groupSize} seat(s). You have selected ${selectedIds.length}.` };
    }

    if (details.requiresAccessibleSeating) {
      const allSelectedAreAccessible = selectedIds.every(id => {
        const seat = allSeats.find(s => s.id === id);
        return seat?.category === 'accessible';
      });
      if (!allSelectedAreAccessible) {
        return { isValid: false, message: "All selected seats must be 'accessible'." };
      }
    }

    if (details.ageOfYoungestMember !== undefined && !details.seniorCitizen) { 
      const ageRequirementMet = selectedIds.every(id => {
        const seat = allSeats.find(s => s.id === id);
        return !seat?.ageRestriction || seat.ageRestriction <= details.ageOfYoungestMember!;
      });
      if (!ageRequirementMet) {
        return { isValid: false, message: `Selected seats do not meet the age requirement (${details.ageOfYoungestMember}+).` };
      }
    }
    return { isValid: true, message: "Selection is valid." };
  }, []);


  useEffect(() => {
    if (pendingBookingDetails) {
      const validation = getSelectionValidation(userSelectedSeatIds, pendingBookingDetails, seats);
      setSelectionValidation(validation);
    } else {
      setSelectionValidation({ isValid: false, message: '' });
    }
  }, [userSelectedSeatIds, pendingBookingDetails, seats, getSelectionValidation]);


  const handleSeatClick = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status === 'broken') {
      toast({ variant: "destructive", title: "Invalid Seat", description: "This seat is broken."});
      return;
    }
    if (seat.status === 'booked' && !(isLocalAdminMode && currentBooking?.bookedSeats.some(s => s.id === seatId))) {
      toast({ variant: "destructive", title: "Seat Unavailable", description: "This seat is already booked."});
      return;
    }

    if (currentBooking && !isLocalAdminMode) { // If a booking is confirmed and not in admin mode, prevent changes
        toast({title: "Booking Confirmed", description: "Cancel your current booking to select new seats."});
        return;
    }

    if (pendingBookingDetails) { // User is reviewing/modifying AI selection or selecting manually after form submission
      setUserSelectedSeatIds(prevSelected => {
        const isCurrentlySelected = prevSelected.includes(seatId);
        if (isCurrentlySelected) {
          return prevSelected.filter(id => id !== seatId);
        } else {
          if (prevSelected.length >= pendingBookingDetails.groupSize) {
            toast({
              variant: "destructive",
              title: "Group Size Limit Reached",
              description: `You cannot select more than ${pendingBookingDetails.groupSize} seat(s).`,
            });
            return prevSelected;
          }
          return [...prevSelected, seatId];
        }
      });
    } else if (isLocalAdminMode && !currentBooking) { // Admin is manually selecting seats before any booking attempt
        setUserSelectedSeatIds(prevSelected =>
        prevSelected.includes(seatId)
            ? prevSelected.filter(id => id !== seatId)
            : [...prevSelected, seatId]
        );
    } else if (!isAuthenticated && !isLocalAdminMode) {
        toast({ title: "Login Required", description: "Please log in to select seats."});
    }
     else {
        // This case implies user is authenticated, not in admin mode, no pending booking, no current booking
        // They should use the form first.
        toast({ title: "Use Booking Form", description: "Please fill out the booking form to get seat suggestions."});
    }
  };

  const saveBookingToDb = async (
    allocatedSeatIds: string[],
    bookingDetails: BookingFormState
  ): Promise<string | null> => { // Returns booking ID from DB or null
    if (!movie) {
      toast({ variant: "destructive", title: "Booking Error", description: "Movie information is missing." });
      return null;
    }
    if (allocatedSeatIds.length === 0) {
      toast({ variant: "destructive", title: "Booking Error", description: "No seats selected for booking." });
      return null;
    }
     if (!isAuthenticated || !authUser) { // This check is crucial
      toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to make a booking." });
      return null;
    }

    const payload: NewBookingPayload = { 
      movieId: movie.id,
      movieTitle: movie.title,
      seatIds: allocatedSeatIds,
      groupSize: bookingDetails.groupSize,
      preferences: bookingDetails,
    };

    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
             toast({ variant: "destructive", title: "Authentication Error", description: responseData.message || "Please log in to book seats."});
        } else if (response.status === 409) { // Conflict, e.g., seats already booked
            toast({ variant: "destructive", title: "Booking Conflict", description: responseData.message || "Some selected seats are no longer available. Please refresh."});
            initializeSeats(); // Re-fetch/reset seats to show current availability
        }
        else {
            throw new Error(responseData.message || 'Failed to save booking to database');
        }
        return null;
      }
      const savedBooking = responseData as BookingEntry; 
      return savedBooking.id;
    } catch (error) {
      toast({ variant: "destructive", title: "Database Error", description: (error as Error).message });
      return null;
    } finally {
        setIsLoading(false);
    }
  };

  const processAiBookingRequest = async (bookingDetails: BookingFormState) => {
    if (!isAuthenticated) {
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to find seats." });
      return;
    }
    if (currentBooking) {
      toast({ variant: "destructive", title: "Existing Booking", description: "Please cancel your current booking before making a new one." });
      return;
    }
    setIsLoading(true);
    setUserSelectedSeatIds([]); // Clear previous manual selections before AI suggests
    try {
        const result = await handleSeatAllocation(seats, bookingDetails);
        const uniqueAllocatedSeatIds = result.allocatedSeatIds && Array.isArray(result.allocatedSeatIds)
                                          ? Array.from(new Set(result.allocatedSeatIds))
                                          : [];

        if (uniqueAllocatedSeatIds.length > 0) {
            setPendingBookingDetails(bookingDetails);
            setUserSelectedSeatIds(uniqueAllocatedSeatIds); // AI suggestions become current selection
            toast({ title: "AI Suggestion", description: result.message || `${uniqueAllocatedSeatIds.length} seats suggested. Review and confirm.` });
        } else {
            toast({ variant: "destructive", title: "AI Booking Failed", description: result.message || "No suitable seats found by AI. Try adjusting criteria." });
            setPendingBookingDetails(null); // Clear pending if AI fails
        }
    } catch (error) {
        toast({ variant: "destructive", title: "AI Booking Error", description: (error as Error).message || "An unexpected error occurred with AI." });
        setPendingBookingDetails(null);
    } finally {
        setIsLoading(false);
    }
  };

  const handleConfirmFinalBooking = async () => {
    if (!isAuthenticated) { // Double check auth
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to confirm your booking." });
      return;
    }
    if (!pendingBookingDetails || userSelectedSeatIds.length === 0) {
        toast({ variant: "destructive", title: "Confirmation Error", description: "No pending booking or seats selected to confirm." });
        return;
    }

    const validation = getSelectionValidation(userSelectedSeatIds, pendingBookingDetails, seats);
    if (!validation.isValid) {
      toast({ variant: "destructive", title: "Invalid Selection", description: validation.message });
      return;
    }

    const dbBookingId = await saveBookingToDb(userSelectedSeatIds, pendingBookingDetails);
    if (dbBookingId) {
        const confirmedSeatsForSummary: Seat[] = [];
        const sortedSelectedIds = [...userSelectedSeatIds].sort((a,b) => a.localeCompare(b));

        sortedSelectedIds.forEach(idToBook => {
            const originalSeat = seats.find(s => s.id === idToBook);
            if (originalSeat) {
                confirmedSeatsForSummary.push({ ...originalSeat, status: 'booked' });
            }
        });

        setSeats(prevSeats =>
            prevSeats.map(s => userSelectedSeatIds.includes(s.id) ? { ...s, status: 'booked', isSelected: false } : s)
        );
        setCurrentBooking({
            id: dbBookingId, // Store the booking ID from DB
            bookedSeats: confirmedSeatsForSummary,
            ...pendingBookingDetails,
        });
        setPendingBookingDetails(null); // Clear pending state
        setUserSelectedSeatIds([]); // Clear selection
        setSelectionValidation({ isValid: false, message: '' });
        toast({ title: "Booking Confirmed!", description: `${confirmedSeatsForSummary.length} seats successfully booked. Booking ID: ${dbBookingId.substring(0,8)}...` });
    }
  };

  const handleAdminBookingConfirm = async () => {
    if (!authUser || authUser?.role !== 'admin') {
      toast({ variant: "destructive", title: "Admin Login Required", description: "Only admins can perform this action." });
      return;
    }
    if (!isLocalAdminMode || userSelectedSeatIds.length === 0) return;

    // For admin, create a minimal BookingFormState based on selection
    const adminBookingDetails: BookingFormState = {
        groupSize: userSelectedSeatIds.length,
        requiresAccessibleSeating: userSelectedSeatIds.some(id => seats.find(s => s.id === id)?.category === 'accessible'),
        wantsVipSeating: userSelectedSeatIds.some(id => seats.find(s => s.id === id)?.category === 'vip'),
        seniorCitizen: userSelectedSeatIds.some(id => seats.find(s => s.id === id)?.category === 'senior'),
        // ageOfYoungestMember not explicitly set for admin direct booking for simplicity
    };

    const dbBookingId = await saveBookingToDb(userSelectedSeatIds, adminBookingDetails);
    if (dbBookingId) {
        const adminBookedSeatsForSummary: Seat[] = [];
         const sortedSelectedIds = [...userSelectedSeatIds].sort((a,b) => a.localeCompare(b));

        sortedSelectedIds.forEach(idToBook => {
            const originalSeat = seats.find(s => s.id === idToBook);
            if (originalSeat) {
                adminBookedSeatsForSummary.push({ ...originalSeat, status: 'booked' });
            }
        });

        setSeats(prevSeats =>
          prevSeats.map(s => userSelectedSeatIds.includes(s.id) ? { ...s, status: 'booked', isSelected: false } : s)
        );
        setCurrentBooking({
          id: dbBookingId,
          bookedSeats: adminBookedSeatsForSummary,
          ...adminBookingDetails,
        });
        setUserSelectedSeatIds([]); // Clear selection
        toast({ title: "Admin Booking Confirmed", description: `${adminBookedSeatsForSummary.length} seats booked. Booking ID: ${dbBookingId.substring(0,8)}...` });
    }
  };

  const handleCancelCurrentBooking = async () => {
    if (!currentBooking || !currentBooking.id) {
        toast({ variant: "destructive", title: "Cancellation Error", description: "No active booking to cancel." });
        return;
    }
    if (!isAuthenticated) { // Should not happen if currentBooking is set, but good check
        toast({ variant: "destructive", title: "Login Required", description: "Please log in to cancel a booking." });
        return;
    }

    setIsLoading(true);
    try {
        const response = await fetch(`/api/bookings/${currentBooking.id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to cancel booking on server.");
        }

        // If server deletion is successful, update local state
        setSeats(prevSeats =>
            prevSeats.map(s =>
                currentBooking.bookedSeats.find(bs => bs.id === s.id)
                ? { ...s, status: 'available', isSelected: false } // Reset status to available
                : s
            )
        );
        setCurrentBooking(null);
        setUserSelectedSeatIds([]); // Clear any lingering selections
        setPendingBookingDetails(null);
        toast({ title: "Booking Cancelled", description: "Your booking has been successfully cancelled." });

    } catch (error) {
        toast({ variant: "destructive", title: "Cancellation Failed", description: (error as Error).message });
    } finally {
        setIsLoading(false);
    }
  };


  const handleClearPendingOrAdminSelection = () => {
    setPendingBookingDetails(null);
    setUserSelectedSeatIds([]);
    setSelectionValidation({ isValid: false, message: '' });
    toast({title: "Selection Cleared", description: "AI suggestions or admin selection has been cleared. You can use the form again."});
  };

  const toggleLocalAdminMode = (isAdmin: boolean) => {
    setIsLocalAdminMode(isAdmin);
    setUserSelectedSeatIds([]); // Clear selections when toggling mode
    setSelectionValidation({ isValid: false, message: '' });
    
    // If disabling admin mode and there was a current booking, it means it was an admin booking.
    // Regular users cannot cancel admin bookings directly through this toggle.
    // If admin mode is disabled and a user booking was present, it remains.
    // If admin mode is disabled and pendingBookingDetails was set (AI flow was active), clear it.
    if (!isAdmin && pendingBookingDetails) {
        handleClearPendingOrAdminSelection();
    }


    if (isAdmin) {
      toast({title: "Local Admin Mode Enabled", description: "Seating rules can be bypassed for manual selection."});
    } else {
      toast({title: "Local Admin Mode Disabled"});
    }
  };

  const canUseAdminControls = authUser?.role === 'admin';
  const isReviewingAiSuggestion = !!pendingBookingDetails && !currentBooking; // Only reviewing if no booking is confirmed

  if (!movie && !isLoading) {
    return (
        <Card>
            <CardHeader><CardTitle>Movie Not Loaded</CardTitle></CardHeader>
            <CardContent><p>The movie details could not be loaded. Please try again.</p></CardContent>
        </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="flex justify-end mb-4">
            <Button onClick={initializeSeats} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4"/> Reset Seats & Availability
            </Button>
        </div>
        {seats.length > 0 ? (
            <SeatingChart
            seats={seats}
            config={seatLayoutConfig}
            onSeatClick={handleSeatClick}
            selectedSeatIds={userSelectedSeatIds} // This state now drives all selections on chart
            disabled={isLoading || (!!currentBooking && !isLocalAdminMode)} // Disable if loading, or booking confirmed (unless admin)
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

        {/* Show login prompt if not authenticated AND not in local admin mode (admin can operate without "user" login) */}
        {!isAuthenticated && !isLocalAdminMode && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><LogIn className="mr-2 h-5 w-5" />Login Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Please log in to view seat availability and make a booking.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href={`/login?callbackUrl=/booking/${movie?.id}`}>Login to Book</Link>
                    </Button>
                </CardFooter>
            </Card>
        )}

        {/* Show Booking Form IF: (Authenticated OR Admin Mode) AND No AI suggestion pending AND No booking confirmed */}
        {(isAuthenticated || isLocalAdminMode) && !isReviewingAiSuggestion && !currentBooking && (
          <BookingForm 
            onSubmit={processAiBookingRequest} 
            isLoading={isLoading} 
            defaultValues={undefined} // Reset form when it appears
          />
        )}

        {/* Show Review Card IF: AI suggestion is pending AND No booking confirmed */}
        {isReviewingAiSuggestion && ( // This implies pendingBookingDetails is not null
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Review Your Selection</CardTitle>
                    <CardDescription>
                        AI suggested seats. You can modify the selection on the chart.
                        Selected: {userSelectedSeatIds.join(', ') || 'None'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-medium">Group Size: {pendingBookingDetails?.groupSize}</p>
                    {pendingBookingDetails?.requiresAccessibleSeating && <p className="text-sm text-primary">Accessible seating requested.</p>}
                    {pendingBookingDetails?.wantsVipSeating && <p className="text-sm text-primary">VIP seating preferred.</p>}
                    {pendingBookingDetails?.seniorCitizen && <p className="text-sm text-primary">Senior citizen booking.</p>}
                    {!selectionValidation.isValid && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm flex items-start">
                            <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
                            <span>{selectionValidation.message}</span>
                        </div>
                    )}
                 </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button
                        onClick={handleConfirmFinalBooking}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                        disabled={isLoading || !selectionValidation.isValid || !isAuthenticated} // Confirm requires auth
                    >
                        <CheckSquare className="mr-2 h-4 w-4" /> Confirm Booking
                    </Button>
                    <Button variant="outline" onClick={handleClearPendingOrAdminSelection} className="w-full" disabled={isLoading}>
                        <XSquare className="mr-2 h-4 w-4" /> Clear Selection / Change Criteria
                    </Button>
                </CardFooter>
            </Card>
        )}

        {/* Show Admin Direct Booking Card IF: Local Admin Mode AND No AI suggestion pending AND No booking confirmed */}
        {isLocalAdminMode && !pendingBookingDetails && !currentBooking && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Admin Seat Selection</CardTitle>
                    <CardDescription>
                        Select seats directly on the chart. Selected: {userSelectedSeatIds.join(', ') || 'None'}
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    {userSelectedSeatIds.length > 0 && (
                        <p className="text-sm text-muted-foreground">Group size will be {userSelectedSeatIds.length}.</p>
                    )}
                 </CardContent>
                <CardFooter>
                    <Button 
                        onClick={handleAdminBookingConfirm} 
                        className="w-full" 
                        disabled={isLoading || userSelectedSeatIds.length === 0 || !canUseAdminControls} // Admin action requires admin role
                    >
                        <CheckSquare className="mr-2 h-4 w-4" /> Confirm Admin Booking
                    </Button>
                </CardFooter>
            </Card>
        )}
        
        {/* BookingSummary handles the "Booking Confirmed" state and "Admin Selection for existing booking" */}
        <BookingSummary
            currentBooking={currentBooking}
            pendingSeats={isReviewingAiSuggestion ? seats.filter(s => userSelectedSeatIds.includes(s.id)) : null}
            adminSelectedSeats={isLocalAdminMode && !isReviewingAiSuggestion && !currentBooking ? seats.filter(s => userSelectedSeatIds.includes(s.id)) : null}
            isAdminMode={isLocalAdminMode && canUseAdminControls}
            onCancelConfirmedBooking={handleCancelCurrentBooking}
            onConfirmAdminBooking={handleAdminBookingConfirm} // This is now primarily for admin modifying *their own* selection before first confirm
            onClearPendingOrAdminSelection={handleClearPendingOrAdminSelection}
            onConfirmPendingBooking={handleConfirmFinalBooking}
            isReviewingAiSuggestion={isReviewingAiSuggestion}
        />
      </aside>
    </div>
  );
};
