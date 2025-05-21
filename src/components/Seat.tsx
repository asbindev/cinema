
'use client';
import type React from 'react';
import { Armchair, Star, Accessibility, Ban, UserCheck, CheckCircle2, UserRound, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Seat, SeatStatus, SeatCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SeatProps {
  seat: Seat;
  onSeatClick: (seatId: string) => void;
  disabled?: boolean;
}

const SeatIcon: React.FC<{ category: SeatCategory, status: SeatStatus, isSelected?: boolean }> = ({ category, status, isSelected }) => {
  if (isSelected) return <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (status === 'booked') return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 opacity-70" />;
  if (status === 'broken') return <Ban className="h-4 w-4 sm:h-5 sm:w-5" />;
  
  switch (category) {
    case 'vip':
      return <Star className="h-4 w-4 sm:h-5 sm:w-5" />;
    case 'accessible':
      return <Accessibility className="h-4 w-4 sm:h-5 sm:w-5" />;
    case 'senior':
      return <UserRound className="h-4 w-4 sm:h-5 sm:w-5" />;
    case 'ageRestricted':
      return <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />;
    default: // regular
      return <Armchair className="h-4 w-4 sm:h-5 sm:w-5" />;
  }
};

export const SeatComponent: React.FC<SeatProps> = ({ seat, onSeatClick, disabled }) => {
  const { id, status, category, isSelected, ageRestriction } = seat;

  const isSeatDisabled = disabled || status === 'booked' || status === 'broken';

  let statusText = `Seat ${id}`;
  if (category !== 'regular') statusText += ` (${category})`;
  if (ageRestriction) statusText += ` - Age ${ageRestriction}+`;
  
  if (status === 'broken') statusText = `Seat ${id} - Broken`;
  else if (status === 'booked') statusText = `Seat ${id} - Booked`;
  else if (isSelected) statusText = `Seat ${id} - Selected`;
  else statusText += ' - Available';

  const seatStyle = cn(
    "p-1.5 sm:p-2 aspect-square transition-all duration-150 ease-in-out transform hover:scale-105",
    "focus:ring-2 focus:ring-offset-2 focus:ring-ring",
    {
      // Available states by category
      'bg-seat-available-regular text-seat-available-regular-foreground hover:bg-seat-available-regular/90': status === 'available' && category === 'regular',
      'bg-seat-available-vip text-seat-available-vip-foreground hover:bg-seat-available-vip/90': status === 'available' && category === 'vip',
      'bg-seat-available-accessible text-seat-available-accessible-foreground hover:bg-seat-available-accessible/90': status === 'available' && category === 'accessible',
      'bg-seat-available-senior text-seat-available-senior-foreground hover:bg-seat-available-senior/90': status === 'available' && category === 'senior',
      'bg-seat-available-age-restricted text-seat-available-age-restricted-foreground hover:bg-seat-available-age-restricted/90': status === 'available' && category === 'ageRestricted',
      
      // Other statuses (override available styling)
      'bg-seat-broken text-seat-broken-foreground cursor-not-allowed opacity-60': status === 'broken',
      'bg-seat-booked text-seat-booked-foreground cursor-not-allowed opacity-80': status === 'booked',
      'bg-seat-selected text-seat-selected-foreground ring-2 ring-offset-2 ring-seat-selected': isSelected,
    }
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={seatStyle}
            onClick={() => onSeatClick(id)}
            disabled={isSeatDisabled}
            aria-label={statusText}
          >
            <SeatIcon category={category} status={status} isSelected={isSelected} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
