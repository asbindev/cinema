
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { CineSeatProLogo } from '@/components/CineSeatProLogo';
import { SeatingChart } from '@/components/SeatingChart';
import { BookingForm } from '@/components/BookingForm';
import { AdminControls } from '@/components/AdminControls'; // Stays for local admin mode toggle
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateInitialSeats, defaultSeatLayoutConfig } from '@/lib/seat-utils';
import type { Seat, BookingFormState, CurrentBooking, SeatLayoutConfig, AuthUser } from '@/lib/types';
import { handleSeatAllocation } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, LogIn, LogOut, UserPlus, Settings } from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [seatLayoutConfig] = useState<SeatLayoutConfig>(defaultSeatLayoutConfig);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIdsForAdmin, setSelectedSeatIdsForAdmin] = useState<string[]>([]);
  const [currentBooking, setCurrentBooking] = useState<CurrentBooking | null>(null);
  const [isLocalAdminMode, setIsLocalAdminMode] = useState(false); // Renamed to avoid confusion with actual admin role
  const [isLoading, setIsLoading] = useState(false);

  const initializeSeats = useCallback(() => {
    const initialSeats = generateInitialSeats(seatLayoutConfig);
    setSeats(initialSeats);
    setCurrentBooking(null);
    setSelectedSeatIdsForAdmin([]);
    toast({ title: "Seat layout reset", description: "New random broken seats generated." });
  }, [seatLayoutConfig, toast]);

  useEffect(() => {
    initializeSeats();
  }, [initializeSeats]);

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

  const processBooking = (bookingDetails: BookingFormState) => {
    if (currentBooking) {
      toast({ variant: "destructive", title: "Existing Booking", description: "Please cancel the current booking before making a new one." });
      return;
    }
    setIsLoading(true);
    handleSeatAllocation(seats, bookingDetails)
      .then(result => {
        if (result.allocatedSeatIds && result.allocatedSeatIds.length > 0) {
          const newBookingId = crypto.randomUUID();
          const bookedSeatsList: Seat[] = [];

          setSeats(prevSeats =>
            prevSeats.map(s => {
              if (result.allocatedSeatIds!.includes(s.id)) {
                const bookedSeat = { ...s, status: 'booked' as const };
                bookedSeatsList.push(bookedSeat);
                return bookedSeat;
              }
              return s;
            })
          );
          
          setCurrentBooking({
            id: newBookingId,
            bookedSeats: bookedSeatsList,
            ...bookingDetails,
          });
          toast({ title: "Booking Successful", description: result.message });
        } else {
          toast({ variant: "destructive", title: "Booking Failed", description: result.message });
        }
      })
      .catch(error => {
        toast({ variant: "destructive", title: "Booking Error", description: error.message || "An unexpected error occurred." });
      })
      .finally(() => setIsLoading(false));
  };

  const handleAdminBookingConfirm = () => {
    if (!isLocalAdminMode || selectedSeatIdsForAdmin.length === 0) return;

    const newBookingId = crypto.randomUUID();
    const adminBookedSeats: Seat[] = [];

    setSeats(prevSeats =>
      prevSeats.map(s => {
        if (selectedSeatIdsForAdmin.includes(s.id)) {
          const bookedSeat = { ...s, status: 'booked' as const };
          adminBookedSeats.push(bookedSeat);
          return bookedSeat;
        }
        return s;
      })
    );
    
    setCurrentBooking({
      id: newBookingId,
      bookedSeats: adminBookedSeats,
      groupSize: adminBookedSeats.length,
      requiresAccessibleSeating: false, 
      wantsVipSeating: false,
      seniorCitizen: false,
    });
    setSelectedSeatIdsForAdmin([]);
    toast({ title: "Local Admin Booking Confirmed", description: `${adminBookedSeats.length} seats booked.` });
  };

  const handleCancelBooking = () => {
    if (!currentBooking) return;
    setSeats(prevSeats =>
      prevSeats.map(s =>
        currentBooking.bookedSeats.find(bs => bs.id === s.id)
          ? { ...s, status: 'available' as const, isSelected: false }
          : s
      )
    );
    setCurrentBooking(null);
    toast({ title: "Booking Cancelled", description: "Seats have been made available." });
  };
  
  const toggleLocalAdminMode = (isAdmin: boolean) => {
    setIsLocalAdminMode(isAdmin);
    setSelectedSeatIdsForAdmin([]);
    if (isAdmin) {
      toast({title: "Local Admin Mode Enabled", description: "Seating rules can be bypassed for local testing."});
    } else {
      toast({title: "Local Admin Mode Disabled"});
    }
  };

  const authUser = session?.user as AuthUser | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
        <CineSeatProLogo />
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button onClick={initializeSeats} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4"/> Reset Seats
          </Button>
          {status === 'loading' ? (
            <Button variant="outline" size="sm" disabled>Loading...</Button>
          ) : session ? (
            <>
              {authUser?.role === 'admin' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin"><Settings className="mr-2 h-4 w-4" /> Admin Panel</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Login</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/register"><UserPlus className="mr-2 h-4 w-4" /> Register</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 order-2 lg:order-1">
          {seats.length > 0 ? (
             <SeatingChart
                seats={seats}
                config={seatLayoutConfig}
                onSeatClick={handleSeatClick}
                selectedSeatIds={selectedSeatIdsForAdmin}
                disabled={!isLocalAdminMode && !!currentBooking}
             />
          ) : (
            <p>Loading seating chart...</p>
          )}
        </div>

        <aside className="lg:col-span-1 space-y-6 order-1 lg:order-2">
          <AdminControls isAdminMode={isLocalAdminMode} onToggleAdminMode={toggleLocalAdminMode} />
          <Separator />
          {!isLocalAdminMode || currentBooking ? (
            <BookingForm onSubmit={processBooking} isLoading={isLoading} defaultValues={currentBooking || undefined} />
          ) : (
            <p className="text-center text-muted-foreground p-4 border rounded-md">
              Local Admin mode: Select seats directly on the chart.
            </p>
          )}
          <Separator />
          <BookingSummary
            currentBooking={currentBooking}
            selectedSeats={seats.filter(s => selectedSeatIdsForAdmin.includes(s.id))}
            isAdminMode={isLocalAdminMode}
            onCancelBooking={handleCancelBooking}
            onConfirmAdminBooking={handleAdminBookingConfirm}
          />
        </aside>
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CineSeat Pro. AI-Powered Seating.</p>
        {session?.user && <p className="text-xs">Logged in as: {session.user.email}</p>}
      </footer>
    </div>
  );
}
