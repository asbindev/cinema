
'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { CineSeatProLogo } from '@/components/CineSeatProLogo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Movie, AuthUser } from '@/lib/types';
import { LogIn, LogOut, UserPlus, Settings, Film, TicketIcon, UserCircle } from 'lucide-react'; // Added UserCircle
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoadingMovies(true);
      try {
        const response = await fetch('/api/movies');
        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        const data = await response.json();
        setMovies(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error fetching movies',
          description: (error as Error).message,
        });
      } finally {
        setIsLoadingMovies(false);
      }
    };
    fetchMovies();
  }, [toast]);

  const authUser = session?.user as AuthUser | undefined;
  const isAdmin = authUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
        <CineSeatProLogo />
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {status === 'loading' ? (
            <Button variant="outline" size="sm" disabled>Loading...</Button>
          ) : session && authUser ? (
            <>
              <span className="text-sm flex items-center mr-2">
                <UserCircle className="mr-1.5 h-5 w-5" /> {authUser.email}
              </span>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin"><Settings className="mr-2 h-4 w-4" /> Admin Panel</Link>
                </Button>
              )}
              {/* Placeholder for My Bookings link for regular users */}
              {/* {authUser && !isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/my-bookings">My Bookings</Link>
                </Button>
              )} */}
              <Button variant="outline" size="sm" onClick={() => signOut()}>
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

      <main className="space-y-8">
        <section>
          <h2 className="text-3xl font-bold mb-6 text-center">Now Showing</h2>
          {isLoadingMovies && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="shadow-lg flex flex-col">
                  <CardHeader>
                    <Skeleton className="aspect-[2/3] w-full rounded-t-md" />
                    <Skeleton className="h-6 w-3/4 mt-4" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter className="border-t pt-4 mt-auto">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          {!isLoadingMovies && movies.length === 0 && (
            <Card className="text-center py-12">
              <CardHeader>
                <Film className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <CardTitle className="text-2xl">No Movies Available</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Check back later for new movie listings.
                  {isAdmin && " Admins can add movies in the admin panel."}
                </p>
                 {isAdmin && (
                    <Button asChild className="mt-4">
                        <Link href="/admin/movies">Add Movies</Link>
                    </Button>
                 )}
              </CardContent>
            </Card>
          )}
          {!isLoadingMovies && movies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {movies.map((movie) => (
                <Card key={movie.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                  <CardHeader className="p-0">
                    <div className="relative aspect-[2/3] w-full rounded-t-md overflow-hidden">
                      <Image
                        src={movie.posterUrl || `https://placehold.co/300x450.png?text=${encodeURIComponent(movie.title)}`}
                        alt={movie.title}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="movie poster"
                        className="bg-muted"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow flex flex-col">
                    <CardTitle className="text-xl mb-1">{movie.title}</CardTitle>
                    {movie.duration && (
                      <CardDescription className="text-xs mb-2">{movie.duration} minutes</CardDescription>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-grow mb-3">
                      {movie.description || 'No description available.'}
                    </p>
                  </CardContent>
                  <CardFooter className="p-4 border-t mt-auto">
                    <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Link href={`/booking/${movie.id}`}>
                        <TicketIcon className="mr-2 h-5 w-5" /> Book Now
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Karma Seat. </p>
        {session?.user && <p className="text-xs">Logged in as: {session.user.email}</p>}
      </footer>
    </div>
  );
}
