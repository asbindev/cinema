
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MovieForm } from '@/components/admin/MovieForm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Movie, MovieFormData, AuthUser } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { PlusCircle, Edit2, Trash2, Film } from 'lucide-react';

export default function AdminMoviesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  const authUser = session?.user as AuthUser | undefined;
  const isAdmin = authUser?.role === 'admin';

  const fetchMovies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/movies');
      if (!response.ok) throw new Error('Failed to fetch movies');
      const data = await response.json();
      setMovies(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleFormSubmit = async (data: MovieFormData) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to perform this action.' });
      return;
    }
    setIsLoading(true);
    const method = editingMovie ? 'PUT' : 'POST';
    const url = editingMovie
      ? `/api/movies/${editingMovie.id}`
      : '/api/movies';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save movie');
      }

      await response.json();
      toast({
        title: 'Success',
        description: `Movie ${editingMovie ? 'updated' : 'added'} successfully.`
      });

      fetchMovies();
      setIsFormOpen(false);
      setEditingMovie(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMovie = async (movieId: number) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to perform this action.' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/movies/${movieId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete movie');
      }

      toast({
        title: 'Success',
        description: 'Movie deleted successfully.'
      });

      fetchMovies();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddMovieForm = () => {
    setEditingMovie(null);
    setIsFormOpen(true);
  };

  const openEditMovieForm = (movie: Movie) => {
    setEditingMovie(movie);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <Film className="mr-2 h-8 w-8" />
          Manage Movies
        </h1>

        {isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddMovieForm}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Movie
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingMovie ? 'Edit Movie' : 'Add New Movie'}</DialogTitle>
                <DialogDescription>
                  {editingMovie ? 'Update the details of this movie.' : 'Fill in the details for the new movie.'}
                </DialogDescription>
              </DialogHeader>
              <MovieForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                defaultValues={editingMovie || undefined}
                submitButtonText={editingMovie ? 'Save Changes' : 'Add Movie'}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && movies.length === 0 && <p>Loading movies...</p>}
      {!isLoading && movies.length === 0 && (
        <Card className="text-center py-8">
          <CardHeader>
            <CardTitle>No Movies Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {isAdmin ? "Get started by adding your first movie." : "No movies are currently listed."}
            </p>
            {isAdmin && (
              <Button onClick={openAddMovieForm}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Movie
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map((movie) => (
          <Card key={movie.id} className="shadow-lg flex flex-col">
            <CardHeader>
              {movie.posterUrl ? (
                <div className="relative aspect-[2/3] w-full rounded-t-md overflow-hidden">
                  <Image
                    src={movie.posterUrl}
                    alt={movie.title}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="movie poster"
                  />
                </div>
              ) : (
                <div className="relative aspect-[2/3] w-full rounded-t-md overflow-hidden bg-muted flex items-center justify-center">
                  <Film className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              <CardTitle className="mt-4">{movie.title}</CardTitle>
              {movie.duration && (
                <CardDescription>{movie.duration} minutes</CardDescription>
              )}
            </CardHeader>

            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {movie.description || 'No description available.'}
              </p>
            </CardContent>

            {isAdmin && (
              <CardFooter className="flex justify-end space-x-2 border-t pt-4 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditMovieForm(movie)}
                >
                  <Edit2 className="mr-1 h-4 w-4" /> Edit
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        movie "{movie.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteMovie(movie.id)}
                      >
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
