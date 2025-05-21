
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
      seatIds: requestedSeatIds, // Renamed for clarity
      groupSize, 
      preferences 
    } = body;

    let userEmailFromBody = body.userEmail;
    let userIdFromBody = body.userId; // This is expected to be number?

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

    // Determine userId and userEmail for storage
    let finalUserId: number | null = null;
    let finalUserEmail: string | null = userEmailFromBody || null;

    if (session?.user) {
      finalUserEmail = session.user.email || finalUserEmail; // Prefer session email
      if (session.user.id) {
        const parsedSessionUserId = parseInt(session.user.id, 10);
        if (!isNaN(parsedSessionUserId)) {
          finalUserId = parsedSessionUserId;
        }
      }
    } else if (userIdFromBody !== undefined) {
      finalUserId = userIdFromBody; // Already a number from NewBookingPayload
    }


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
    
    // Check if insert was successful for UUIDs (lastID might not be set, check changes)
    if (result.changes === 0) {
        // Attempt to verify if the row was inserted, as 'lastID' is not reliable for TEXT primary keys.
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
    
    const bookings: BookingEntry[] = bookingsFromDb.map(b => {
        let preferences;
        try {
            preferences = JSON.parse(b.preferencesJson);
        } catch (e) {
            console.error("Failed to parse preferencesJson from DB:", b.preferencesJson, e);
            preferences = {}; // Default to empty object on error
        }
        let seatIds;
        try {
            seatIds = JSON.parse(b.seatIds);
        } catch (e) {
            console.error("Failed to parse seatIds from DB:", b.seatIds, e);
            seatIds = []; // Default to empty array on error
        }

        return {
            id: b.id,
            movieId: b.movieId,
            movieTitle: b.movieTitle,
            userId: b.userId, // This will be number or null from DB
            userEmail: b.userEmail || (b.userName ? `${b.userName}'s guest` : 'Guest'),
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
