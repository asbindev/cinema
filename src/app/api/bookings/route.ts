
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { NewBookingPayload, BookingEntry, AuthUser } from '@/lib/types';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// POST /api/bookings - Create a new booking
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in to make a booking.' }, { status: 401 });
    }
    const authUser = session.user as AuthUser;
    if (!authUser.id || !authUser.email) {
        return NextResponse.json({ message: 'User session is invalid or incomplete.' }, { status: 400 });
    }

    const body = await request.json() as Omit<NewBookingPayload, 'userId' | 'userEmail'>; // userId and userEmail removed from client payload

    const { 
      movieId, 
      movieTitle, 
      seatIds: requestedSeatIds,
      groupSize, 
      preferences 
    } = body;

    if (!movieId || !movieTitle || !requestedSeatIds || requestedSeatIds.length === 0 || !groupSize) {
      return NextResponse.json({ message: 'Missing required booking information' }, { status: 400 });
    }

    const db = await getDb();

    // Server-side check for seat availability for this movie
    const existingBookingsForMovie = await db.all('SELECT seatIds FROM bookings WHERE movieId = ?', movieId);
    const allBookedSeatIdsForMovie = new Set<string>();
    existingBookingsForMovie.forEach(booking => {
      try {
        const bookedSeatsInDb: string[] = JSON.parse(booking.seatIds);
        bookedSeatsInDb.forEach(seatId => allBookedSeatIdsForMovie.add(seatId));
      } catch (e) {
        console.error("Failed to parse seatIds from DB booking:", booking.seatIds, e);
      }
    });

    for (const requestedSeatId of requestedSeatIds) {
      if (allBookedSeatIdsForMovie.has(requestedSeatId)) {
        return NextResponse.json({ message: `Seat ${requestedSeatId} is already booked for this movie. Please refresh and try again.` }, { status: 409 }); // 409 Conflict
      }
    }

    const finalUserId = parseInt(authUser.id, 10);
    if (isNaN(finalUserId)) {
        // This should ideally not happen if session.user.id is always a string convertible to number
        console.error("Failed to parse session user ID:", authUser.id);
        return NextResponse.json({ message: 'Invalid user ID in session.' }, { status: 500 });
    }
    const finalUserEmail = authUser.email;


    const bookingId = crypto.randomUUID();
    const bookingTime = new Date().toISOString();

    const result = await db.run(
      'INSERT INTO bookings (id, movieId, movieTitle, userId, userEmail, seatIds, groupSize, preferencesJson, bookingTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      bookingId,
      movieId,
      movieTitle,
      finalUserId, 
      finalUserEmail,
      JSON.stringify(requestedSeatIds),
      groupSize,
      JSON.stringify(preferences),
      bookingTime
    );
    
    if (result.changes === 0) {
        const check = await db.get('SELECT id FROM bookings WHERE id = ?', bookingId);
        if (!check) {
           throw new Error('Failed to insert booking, verification query failed.');
        }
    }

    const newBooking: BookingEntry = {
      id: bookingId,
      movieId,
      movieTitle,
      userId: finalUserId,
      userEmail: finalUserEmail,
      seatIds: requestedSeatIds,
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
    if (!session || !session.user || (session.user as AuthUser).role !== 'admin') { // Explicitly cast to AuthUser
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
    
    const bookings: BookingEntry[] = bookingsFromDb.map(b => {
        let preferences;
        try {
            preferences = JSON.parse(b.preferencesJson);
        } catch (e) {
            console.error("Failed to parse preferencesJson from DB:", b.preferencesJson, e);
            preferences = {}; 
        }
        let seatIds;
        try {
            seatIds = JSON.parse(b.seatIds);
        } catch (e) {
            console.error("Failed to parse seatIds from DB:", b.seatIds, e);
            seatIds = []; 
        }

        return {
            id: b.id,
            movieId: b.movieId,
            movieTitle: b.movieTitle,
            userId: b.userId, 
            userEmail: b.userEmail || (b.userName ? `${b.userName}'s guest (legacy)` : 'Legacy Guest'),
            seatIds: seatIds,
            groupSize: b.groupSize,
            preferences: preferences,
            bookingTime: b.bookingTime,
        };
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings', error: (error as Error).message }, { status: 500 });
  }
}

