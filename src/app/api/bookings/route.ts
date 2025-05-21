
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { NewBookingPayload, BookingEntry } from '@/lib/types';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// POST /api/bookings - Create a new booking
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json() as NewBookingPayload;

    const { 
      movieId, 
      movieTitle, 
      seatIds, 
      groupSize, 
      preferences 
    } = body;

    let userEmail = body.userEmail;
    let userId = body.userId;

    if (session?.user) {
        userEmail = session.user.email || userEmail; // Prefer session email
        userId = session.user.id || userId; // Prefer session user ID
    }


    if (!movieId || !movieTitle || !seatIds || seatIds.length === 0 || !groupSize) {
      return NextResponse.json({ message: 'Missing required booking information' }, { status: 400 });
    }

    const db = await getDb();
    const bookingId = crypto.randomUUID();
    const bookingTime = new Date().toISOString();

    const result = await db.run(
      'INSERT INTO bookings (id, movieId, movieTitle, userId, userEmail, seatIds, groupSize, preferencesJson, bookingTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      bookingId,
      movieId,
      movieTitle,
      userId || null, // userId is string from AuthUser
      userEmail || null,
      JSON.stringify(seatIds),
      groupSize,
      JSON.stringify(preferences),
      bookingTime
    );

    if (!result.lastID && result.changes === 0) { // For INSERT, lastID might not be relevant for UUIDs, check changes
        // Sqlite specific: for text PKs, lastID is not set. Check changes.
        const check = await db.get('SELECT id FROM bookings WHERE id = ?', bookingId);
        if (!check) {
           throw new Error('Failed to insert booking, verification query failed.');
        }
    }

    const newBooking: BookingEntry = {
      id: bookingId,
      movieId,
      movieTitle,
      userId,
      userEmail,
      seatIds,
      groupSize,
      preferences,
      bookingTime,
    };
    
    return NextResponse.json(newBooking, { status: 201 });

  } catch (error) {
    console.error('Failed to create booking:', error);
    return NextResponse.json({ message: 'Failed to create booking', error: (error as Error).message }, { status: 500 });
  }
}

// GET /api/bookings - Fetch all bookings (for admin)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    // Basic protection: ensure user is admin (can be enhanced)
    if (!session || session.user?.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

  try {
    const db = await getDb();
    const bookingsFromDb = await db.all(`
        SELECT 
            b.id, 
            b.movieId, 
            b.movieTitle, 
            b.userId, 
            b.userEmail, 
            b.seatIds, 
            b.groupSize, 
            b.preferencesJson, 
            b.bookingTime,
            u.name as userName 
        FROM bookings b
        LEFT JOIN users u ON b.userId = u.id 
        ORDER BY b.bookingTime DESC
    `);
    
    const bookings: BookingEntry[] = bookingsFromDb.map(b => ({
        id: b.id,
        movieId: b.movieId,
        movieTitle: b.movieTitle,
        userId: b.userId,
        userEmail: b.userEmail || (b.userName ? `${b.userName}'s guest` : 'Guest'), // Fallback for display
        seatIds: JSON.parse(b.seatIds),
        groupSize: b.groupSize,
        preferences: JSON.parse(b.preferencesJson),
        bookingTime: b.bookingTime,
    }));

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings', error: (error as Error).message }, { status: 500 });
  }
}
