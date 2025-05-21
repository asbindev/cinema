
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Movie, MovieFormData, AuthUser } from '@/lib/types';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/movies/[movieId] - Fetch a single movie by ID
export async function GET(
  request: Request,
  { params }: { params: { movieId: string } }
) {
  try {
    const movieId = parseInt(params.movieId, 10);
    if (isNaN(movieId)) {
      return NextResponse.json({ message: 'Invalid movie ID' }, { status: 400 });
    }

    const db = await getDb();
    const movie = await db.get<Movie>('SELECT * FROM movies WHERE id = ?', movieId);

    if (!movie) {
      return NextResponse.json({ message: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error('Failed to fetch movie:', error);
    return NextResponse.json({ message: 'Failed to fetch movie', error: (error as Error).message }, { status: 500 });
  }
}

// PUT /api/movies/[movieId] - Update a movie (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: { movieId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as AuthUser).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const movieId = parseInt(params.movieId, 10);
    if (isNaN(movieId)) {
      return NextResponse.json({ message: 'Invalid movie ID' }, { status: 400 });
    }

    const body = await request.json() as MovieFormData;
    const { title, description, posterUrl, duration } = body;

    if (!title) {
      return NextResponse.json({ message: 'Title is required for update.' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run(
      'UPDATE movies SET title = ?, description = ?, posterUrl = ?, duration = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      title,
      description || null,
      posterUrl || null,
      duration || null,
      movieId
    );

    if (result.changes === 0) {
      return NextResponse.json({ message: 'Movie not found or no changes made.' }, { status: 404 });
    }

    const updatedMovie = await db.get<Movie>('SELECT * FROM movies WHERE id = ?', movieId);
    return NextResponse.json(updatedMovie, { status: 200 });

  } catch (error) {
    console.error('Failed to update movie:', error);
    return NextResponse.json({ message: 'Failed to update movie', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/movies/[movieId] - Delete a movie (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { movieId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as AuthUser).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const movieId = parseInt(params.movieId, 10);
    if (isNaN(movieId)) {
      return NextResponse.json({ message: 'Invalid movie ID' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run('DELETE FROM movies WHERE id = ?', movieId);

    if (result.changes === 0) {
      return NextResponse.json({ message: 'Movie not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Movie deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete movie:', error);
    return NextResponse.json({ message: 'Failed to delete movie', error: (error as Error).message }, { status: 500 });
  }
}
