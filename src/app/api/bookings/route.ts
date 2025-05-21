
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

    const body = await request.json() as Omit<NewBookingPayload, 'userId' | 'userEmail'>; 

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
        const bookedSeatsInDb: string[] = JSON.parse(booking.seatIds); // seatIds is TEXT
        bookedSeatsInDb.forEach(seatId => allBookedSeatIdsForMovie.add(seatId));
      } catch (e) {
        console.error("Failed to parse seatIds from DB booking:", booking.seatIds, e);
      }
    });

    for (const requestedSeatId of requestedSeatIds) {
      if (allBookedSeatIdsForMovie.has(requestedSeatId)) {
        return NextResponse.json({ message: `Seat ${requestedSeatId} is already booked for this movie. Please refresh and try again.` }, { status: 409 }); 
      }
    }

    const finalUserId = parseInt(authUser.id, 10); 
    if (isNaN(finalUserId)) {
        console.error("Failed to parse session user ID to number:", authUser.id);
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
    
    if (result.changes === 0) { // For UUID PKs, changes is more reliable than lastID
        // Verify insertion manually if lastID is not reliable for UUIDs
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

// GET /api/bookings - Fetch bookings (role-aware)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user ) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const authUser = session.user as AuthUser;

  try {
    const db = await getDb();
    let bookingsFromDb;

    if (authUser.role === 'admin') {
      // Admin sees all bookings
      bookingsFromDb = await db.all(`
          SELECT 
              b.id, 
              b.movieId, 
              b.movieTitle, 
              b.userId, 
              COALESCE(u.email, b.userEmail) as userDisplayEmail,
              b.seatIds, 
              b.groupSize, 
              b.preferencesJson, 
              b.bookingTime
          FROM bookings b
          LEFT JOIN users u ON b.userId = u.id 
          ORDER BY b.bookingTime DESC
      `);
    } else {
      // Regular user sees only their own bookings
      const userIdNum = parseInt(authUser.id, 10);
      if (isNaN(userIdNum)) {
        return NextResponse.json({ message: 'Invalid user ID in session for filtering bookings.' }, { status: 400 });
      }
      bookingsFromDb = await db.all(`
          SELECT 
              b.id, 
              b.movieId, 
              b.movieTitle, 
              b.userId, 
              b.userEmail as userDisplayEmail, -- For user's own bookings, their stored email is fine
              b.seatIds, 
              b.groupSize, 
              b.preferencesJson, 
              b.bookingTime
          FROM bookings b
          WHERE b.userId = ?
          ORDER BY b.bookingTime DESC
      `, userIdNum);
    }
    
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
            userEmail: b.userDisplayEmail, 
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
