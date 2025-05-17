
'use client';

import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { MovieFormData } from '@/lib/types';

const movieFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  posterUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(1, 'Duration must be at least 1 minute').optional()
  ),
});

interface MovieFormProps {
  onSubmit: (data: MovieFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<MovieFormData>;
  submitButtonText?: string;
}

export const MovieForm: React.FC<MovieFormProps> = ({
  onSubmit,
  isLoading,
  defaultValues,
  submitButtonText = 'Add Movie',
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MovieFormData>({
    resolver: zodResolver(movieFormSchema),
    defaultValues: defaultValues || {
      title: '',
      description: '',
      posterUrl: '',
      duration: undefined,
    },
  });

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle>{submitButtonText}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="posterUrl">Poster URL</Label>
            <Input
              id="posterUrl"
              type="url"
              {...register('posterUrl')}
              placeholder="https://placehold.co/300x450.png"
              className={errors.posterUrl ? 'border-destructive' : ''}
            />
            {errors.posterUrl && (
              <p className="text-sm text-destructive">{errors.posterUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              {...register('duration')}
              min="1"
              className={errors.duration ? 'border-destructive' : ''}
            />
            {errors.duration && (
              <p className="text-sm text-destructive">{errors.duration.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : submitButtonText}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
