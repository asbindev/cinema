
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { AuthUser, BookingEntry } from '@/lib/types';

export async function DELETE(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    const authUser = session.user as AuthUser;

    const bookingId = params.bookingId;
    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const booking = await db.get<BookingEntry>('SELECT * FROM bookings WHERE id = ?', bookingId);

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    // Check if the user is an admin or the owner of the booking
    const userIdFromSession = parseInt(authUser.id, 10); // Ensure numeric comparison if userId in DB is number
    if (authUser.role !== 'admin' && booking.userId !== userIdFromSession) {
      return NextResponse.json({ message: 'Forbidden. You do not have permission to cancel this booking.' }, { status: 403 });
    }

    const result = await db.run('DELETE FROM bookings WHERE id = ?', bookingId);

    if (result.changes === 0) {
      // This might happen if the booking was deleted by another request just before this one
      return NextResponse.json({ message: 'Booking not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Booking cancelled successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Failed to cancel booking:', error);
    return NextResponse.json({ message: 'Failed to cancel booking', error: (error as Error).message }, { status: 500 });
  }
}
