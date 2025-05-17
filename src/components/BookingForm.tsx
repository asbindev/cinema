'use client';
import type React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { BookingFormState } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const bookingFormSchema = z.object({
  groupSize: z.number().min(1, "Group size must be at least 1").max(7, "Group size cannot exceed 7"),
  requiresAccessibleSeating: z.boolean().default(false),
  wantsVipSeating: z.boolean().default(false),
  ageOfYoungestMember: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number().min(0, "Age cannot be negative").optional()
  ),
  seniorCitizen: z.boolean().default(false),
});

interface BookingFormProps {
  onSubmit: (data: BookingFormState) => void;
  isLoading: boolean;
  defaultValues?: Partial<BookingFormState>;
}

export const BookingForm: React.FC<BookingFormProps> = ({ onSubmit, isLoading, defaultValues }) => {
  const { control, handleSubmit, register, formState: { errors } } = useForm<BookingFormState>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      groupSize: defaultValues?.groupSize || 1,
      requiresAccessibleSeating: defaultValues?.requiresAccessibleSeating || false,
      wantsVipSeating: defaultValues?.wantsVipSeating || false,
      ageOfYoungestMember: defaultValues?.ageOfYoungestMember,
      seniorCitizen: defaultValues?.seniorCitizen || false,
    },
  });

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Book Your Seats</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="groupSize">Group Size (1-7)</Label>
            <Input
              id="groupSize"
              type="number"
              {...register('groupSize', { valueAsNumber: true })}
              min="1"
              max="7"
              className={errors.groupSize ? 'border-destructive' : ''}
            />
            {errors.groupSize && <p className="text-sm text-destructive">{errors.groupSize.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageOfYoungestMember">Age of Youngest Member (if any)</Label>
            <Input
              id="ageOfYoungestMember"
              type="number"
              {...register('ageOfYoungestMember')}
              min="0"
              className={errors.ageOfYoungestMember ? 'border-destructive' : ''}
            />
            {errors.ageOfYoungestMember && <p className="text-sm text-destructive">{errors.ageOfYoungestMember.message}</p>}
          </div>
          
          <div className="flex items-center space-x-2">
            <Controller
              name="requiresAccessibleSeating"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="requiresAccessibleSeating"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="requiresAccessibleSeating" className="cursor-pointer">Requires Accessible Seating</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="wantsVipSeating"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="wantsVipSeating"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="wantsVipSeating" className="cursor-pointer">Wants VIP Seating</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="seniorCitizen"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="seniorCitizen"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="seniorCitizen" className="cursor-pointer">Senior Citizen Booking</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Finding Seats...' : 'Find Seats with AI'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
