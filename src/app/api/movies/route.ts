
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Movie, AuthUser } from '@/lib/types';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/movies - Fetch all movies
export async function GET() {
  try {
    const db = await getDb();
    const movies = await db.all<Movie[]>('SELECT * FROM movies ORDER BY createdAt DESC');
    return NextResponse.json(movies);
  } catch (error) {
    console.error('Failed to fetch movies:', error);
    return NextResponse.json({ message: 'Failed to fetch movies', error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/movies - Create a new movie (Admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as AuthUser).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { title, description, posterUrl, duration } = await request.json();

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO movies (title, description, posterUrl, duration) VALUES (?, ?, ?, ?)',
      title,
      description || null,
      posterUrl || null,
      duration || null
    );

    if (!result.lastID) {
        throw new Error('Failed to insert movie, no lastID returned');
    }

    const newMovie = await db.get<Movie>('SELECT * FROM movies WHERE id = ?', result.lastID);
    return NextResponse.json(newMovie, { status: 201 });
  } catch (error) {
    console.error('Failed to create movie:', error);
    return NextResponse.json({ message: 'Failed to create movie', error: (error as Error).message }, { status: 500 });
  }
}
