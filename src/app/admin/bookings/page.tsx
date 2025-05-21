
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { BookingEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Ticket, CalendarDays, Users, Film, UserCircle, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminBookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch bookings');
      }
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Fetching Bookings',
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <Ticket className="mr-3 h-8 w-8 text-primary" />
          Customer Bookings
        </h1>
      </div>
      <CardDescription>
        View and manage all seat reservations made by customers.
      </CardDescription>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!isLoading && bookings.length === 0 && (
            <div className="text-center py-8">
              <Ticket className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bookings found yet.</p>
            </div>
          )}
          {!isLoading && bookings.length > 0 && (
            <Table>
              <TableCaption>A list of all customer bookings.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead><Film className="inline-block mr-1 h-4 w-4" /> Movie Title</TableHead>
                  <TableHead><UserCircle className="inline-block mr-1 h-4 w-4" /> User Email</TableHead>
                  <TableHead><Hash className="inline-block mr-1 h-4 w-4" /> User ID</TableHead>
                  <TableHead><Users className="inline-block mr-1 h-4 w-4" /> Seats</TableHead>
                  <TableHead>Group Size</TableHead>
                  <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4" /> Booking Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <Badge variant="secondary" className="truncate max-w-[100px]">{booking.id.substring(0,8)}...</Badge>
                    </TableCell>
                    <TableCell>{booking.movieTitle}</TableCell>
                    <TableCell>{booking.userEmail || 'N/A'}</TableCell>
                    <TableCell>{booking.userId === null || booking.userId === undefined ? 'N/A' : booking.userId.toString()}</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {booking.seatIds.map(seatId => (
                                <Badge key={seatId} variant="outline">{seatId}</Badge>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell>{booking.groupSize}</TableCell>
                    <TableCell>
                      {format(new Date(booking.bookingTime), "MMM d, yyyy 'at' h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
