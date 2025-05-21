
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
import { RefreshCw } from 'lucide-react';

interface BookingSystemProps {
  movie?: Movie | null; // Movie details for saving booking
}

export const BookingSystem: React.FC<BookingSystemProps> = ({ movie }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [seatLayoutConfig] = useState<SeatLayoutConfig>(defaultSeatLayoutConfig);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIdsForAdmin, setSelectedSeatIdsForAdmin] = useState<string[]>([]);
  const [currentBooking, setCurrentBooking] = useState<CurrentBooking | null>(null);
  const [isLocalAdminMode, setIsLocalAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const authUser = session?.user as AuthUser | undefined;

  const initializeSeats = useCallback(() => {
    const initialSeats = generateInitialSeats(seatLayoutConfig);
    setSeats(initialSeats);
    setCurrentBooking(null);
    setSelectedSeatIdsForAdmin([]);
    if (seats.length > 0) { 
        toast({ title: "Seat layout reset", description: "New random broken seats generated." });
    }
  }, [seatLayoutConfig, toast, seats.length]);

  useEffect(() => {
    initializeSeats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSeatClick = (seatId: string) => {
    if (!isLocalAdminMode || currentBooking) return;

    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status === 'booked' || seat.status === 'broken') {
      toast({ variant: "destructive", title: "Invalid Seat", description: "This seat cannot be selected."});
      return;
    }

    setSelectedSeatIdsForAdmin(prevSelected =>
      prevSelected.includes(seatId)
        ? prevSelected.filter(id => id !== seatId)
        : [...prevSelected, seatId]
    );
  };

  const saveBookingToDb = async (
    allocatedSeatIds: string[], 
    bookingDetails: BookingFormState
  ): Promise<string | null> => {
    if (!movie) {
      toast({ variant: "destructive", title: "Booking Error", description: "Movie information is missing." });
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
      return savedBooking.id; // Return the database booking ID
    } catch (error) {
      toast({ variant: "destructive", title: "Database Error", description: (error as Error).message });
      return null;
    }
  };


  const processBooking = async (bookingDetails: BookingFormState) => {
    if (currentBooking) {
      toast({ variant: "destructive", title: "Existing Booking", description: "Please cancel the current booking before making a new one." });
      return;
    }
    setIsLoading(true);
    try {
        const result = await handleSeatAllocation(seats, bookingDetails);
        if (result.allocatedSeatIds && result.allocatedSeatIds.length > 0) {
            const dbBookingId = await saveBookingToDb(result.allocatedSeatIds, bookingDetails);
            if (!dbBookingId) {
                // Error handled by saveBookingToDb toast
                setIsLoading(false);
                return;
            }

            const bookedSeatsList: Seat[] = [];
            setSeats(prevSeats =>
                prevSeats.map(s => {
                if (result.allocatedSeatIds!.includes(s.id)) {
                    const bookedSeat = { ...s, status: 'booked' as const, isSelected: false };
                    bookedSeatsList.push(bookedSeat);
                    return bookedSeat;
                }
                return s;
                })
            );
            
            setCurrentBooking({
                id: dbBookingId, // Use database booking ID
                bookedSeats: bookedSeatsList,
                ...bookingDetails,
            });
            toast({ title: "Booking Successful", description: result.message });
        } else {
            toast({ variant: "destructive", title: "Booking Failed", description: result.message });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Booking Error", description: (error as Error).message || "An unexpected error occurred." });
    } finally {
        setIsLoading(false);
    }
  };

  const handleAdminBookingConfirm = async () => {
    if (!isLocalAdminMode || selectedSeatIdsForAdmin.length === 0) return;
    setIsLoading(true);

    const adminBookingDetails: BookingFormState = {
        groupSize: selectedSeatIdsForAdmin.length,
        requiresAccessibleSeating: false, // Default for admin manual booking
        wantsVipSeating: false, // Default
        seniorCitizen: false, // Default
    };

    const dbBookingId = await saveBookingToDb(selectedSeatIdsForAdmin, adminBookingDetails);
    if (!dbBookingId) {
        setIsLoading(false);
        return;
    }
    
    const adminBookedSeatsObjects: Seat[] = [];
    setSeats(prevSeats =>
      prevSeats.map(s => {
        if (selectedSeatIdsForAdmin.includes(s.id)) {
          const bookedSeat = { ...s, status: 'booked' as const, isSelected: false };
          adminBookedSeatsObjects.push(bookedSeat);
          return bookedSeat;
        }
        return s;
      })
    );
    
    setCurrentBooking({
      id: dbBookingId,
      bookedSeats: adminBookedSeatsObjects,
      ...adminBookingDetails,
    });
    setSelectedSeatIdsForAdmin([]);
    toast({ title: "Admin Booking Confirmed", description: `${adminBookedSeatsObjects.length} seats booked and saved.` });
    setIsLoading(false);
  };

  const handleCancelBooking = () => {
    if (!currentBooking) return;
    // Note: We are not deleting from DB here, just making seats available locally.
    // A full cancel would need a DELETE /api/bookings/:id call.
    setSeats(prevSeats =>
      prevSeats.map(s =>
        currentBooking.bookedSeats.find(bs => bs.id === s.id)
          ? { ...s, status: 'available' as const, isSelected: false }
          : s
      )
    );
    setCurrentBooking(null);
    toast({ title: "Booking Cancelled Locally", description: "Seats have been made available on the chart. Booking still exists in DB." });
  };
  
  const toggleLocalAdminMode = (isAdmin: boolean) => {
    setIsLocalAdminMode(isAdmin);
    setSelectedSeatIdsForAdmin([]); 
    if (currentBooking && !isAdmin) handleCancelBooking(); 

    if (isAdmin) {
      toast({title: "Local Admin Mode Enabled", description: "Seating rules can be bypassed for local testing."});
    } else {
      toast({title: "Local Admin Mode Disabled"});
    }
  };
  
  const canUseAdminControls = authUser?.role === 'admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="flex justify-end mb-4">
            <Button onClick={initializeSeats} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4"/> Reset Seats
            </Button>
        </div>
        {seats.length > 0 ? (
            <SeatingChart
            seats={seats}
            config={seatLayoutConfig}
            onSeatClick={handleSeatClick}
            selectedSeatIds={selectedSeatIdsForAdmin}
            disabled={(!isLocalAdminMode && !!currentBooking) || isLoading}
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
        {!isLocalAdminMode || currentBooking ? (
        <BookingForm onSubmit={processBooking} isLoading={isLoading} defaultValues={currentBooking || undefined} />
        ) : (
        <p className="text-center text-muted-foreground p-4 border rounded-md">
            Local Admin mode: Select seats directly on the chart. Click "Confirm Admin Booking" below.
        </p>
        )}
        <Separator />
        <BookingSummary
        currentBooking={currentBooking}
        selectedSeats={seats.filter(s => selectedSeatIdsForAdmin.includes(s.id))}
        isAdminMode={isLocalAdminMode && canUseAdminControls} 
        onCancelBooking={handleCancelBooking}
        onConfirmAdminBooking={handleAdminBookingConfirm}
        />
      </aside>
    </div>
  );
};
