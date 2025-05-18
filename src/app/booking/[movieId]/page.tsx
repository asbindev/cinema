
'use client';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { CineSeatProLogo } from '@/components/CineSeatProLogo';
import { BookingSystem } from '@/components/BookingSystem';
import { Button } from '@/components/ui/button';
import type { Movie, AuthUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, LogOut, UserPlus, Settings, ArrowLeft } from 'lucide-react';

export default function MovieBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoadingMovie, setIsLoadingMovie] = useState(true);

  const movieId = params.movieId as string;

  useEffect(() => {
    if (movieId) {
      const fetchMovie = async () => {
        setIsLoadingMovie(true);
        try {
          const response = await fetch(`/api/movies/${movieId}`);
          if (response.status === 404) {
            toast({
              variant: 'destructive',
              title: 'Movie not found',
              description: 'The movie you are looking for does not exist.',
            });
            router.push('/'); // Redirect to homepage if movie not found
            return;
          }
          if (!response.ok) {
            throw new Error('Failed to fetch movie details');
          }
          const data = await response.json();
          setMovie(data);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: (error as Error).message,
          });
        } finally {
          setIsLoadingMovie(false);
        }
      };
      fetchMovie();
    }
  }, [movieId, toast, router]);

  const authUser = session?.user as AuthUser | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
            </Button>
            <CineSeatProLogo />
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {status === 'loading' ? (
            <Button variant="outline" size="sm" disabled>Loading...</Button>
          ) : session ? (
            <>
              {authUser?.role === 'admin' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin"><Settings className="mr-2 h-4 w-4" /> Admin Panel</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
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

      <main className="space-y-6">
        {isLoadingMovie && (
          <div className="text-center">
            <Skeleton className="h-8 w-1/2 mx-auto mb-4" />
            <Skeleton className="h-6 w-1/3 mx-auto" />
          </div>
        )}
        {!isLoadingMovie && movie && (
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">Booking for: {movie.title}</h1>
            {movie.description && <p className="text-muted-foreground mt-1">{movie.description.substring(0,100)}...</p>}
          </div>
        )}
        {!isLoadingMovie && !movie && (
           <div className="text-center py-10">
             <h2 className="text-2xl font-semibold text-destructive">Movie not found or could not be loaded.</h2>
             <Button asChild className="mt-4">
                <Link href="/">Go to Homepage</Link>
             </Button>
           </div>
        )}
        
        {/* Render BookingSystem only if movie is loaded, or if still loading but movieId is present */}
        {(isLoadingMovie && movieId || !isLoadingMovie && movie) && <BookingSystem />}

      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CineSeat Pro. AI-Powered Seating.</p>
         {session?.user && <p className="text-xs">Logged in as: {session.user.email}</p>}
      </footer>
    </div>
  );
}
