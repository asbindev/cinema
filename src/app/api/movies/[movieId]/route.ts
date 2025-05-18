
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Movie } from '@/lib/types';

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

// Note: PUT and DELETE for a specific movie would also go here
// For example:
// export async function PUT(request: Request, { params }: { params: { movieId: string }}) { ... }
// export async function DELETE(request: Request, { params }: { params: { movieId: string }}) { ... }
