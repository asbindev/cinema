
'use client';
import React from 'react';
import { SeatComponent } from './Seat';
import type { Seat, SeatLayoutConfig } from '@/lib/types';
import { getAisleAfterSeat } from '@/lib/seat-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Armchair, Star, Accessibility, Ban, CheckCircle2, UserCheck, UserRound, ShieldAlert } from 'lucide-react';

interface SeatingChartProps {
  seats: Seat[];
  config: SeatLayoutConfig;
  onSeatClick: (seatId: string) => void;
  selectedSeatIds: string[];
  disabled?: boolean;
}

const LegendItem: React.FC<{ colorClass: string, icon: React.ElementType, label: string, iconColorClass?: string }> = ({ colorClass, icon: Icon, label, iconColorClass }) => (
  <div className="flex items-center space-x-2">
    <div className={`p-1 rounded ${colorClass}`}>
      <Icon className={`h-4 w-4 ${iconColorClass || ''}`} />
    </div>
    <span className="text-xs">{label}</span>
  </div>
);

export const SeatingChart: React.FC<SeatingChartProps> = ({ seats, config, onSeatClick, selectedSeatIds, disabled }) => {
  const aisleAfterSeat = getAisleAfterSeat(config);

  const seatsByRow: { [key: string]: Seat[] } = {};
  seats.forEach(seat => {
    if (!seatsByRow[seat.row]) {
      seatsByRow[seat.row] = [];
    }
    seatsByRow[seat.row].push(seat);
  });

  const sortedRowLabels = Object.keys(seatsByRow).sort();
  
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-xl font-semibold">Movie Screen</CardTitle>
        <div className="h-2 bg-foreground/80 rounded-md my-2 mx-auto w-3/4 max-w-md shadow-inner"></div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="overflow-x-auto">
          <div className="grid gap-1.5 sm:gap-2 justify-center" style={{ gridTemplateColumns: `repeat(${config.seatsPerRow + 1}, auto)` }}> {/* +1 for row labels */}
            {sortedRowLabels.map((rowLabel) => (
              <React.Fragment key={rowLabel}>
                <div className="flex items-center justify-center font-medium text-muted-foreground text-sm sm:text-base self-center">
                  {rowLabel}
                </div>
                {seatsByRow[rowLabel].sort((a,b) => a.number - b.number).map((seat, seatIndex) => (
                  <div
                    key={seat.id}
                    className={`flex justify-center items-center ${seatIndex === aisleAfterSeat ? 'mr-2 sm:mr-3' : ''}`}
                  >
                    <SeatComponent
                      seat={{...seat, isSelected: selectedSeatIds.includes(seat.id)}}
                      onSeatClick={onSeatClick}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 p-2 border-t pt-4">
            <LegendItem colorClass="bg-seat-available-regular" iconColorClass="text-seat-available-regular-foreground" icon={Armchair} label="Regular" />
            <LegendItem colorClass="bg-seat-available-vip" iconColorClass="text-seat-available-vip-foreground" icon={Star} label="VIP" />
            <LegendItem colorClass="bg-seat-available-accessible" iconColorClass="text-seat-available-accessible-foreground" icon={Accessibility} label="Accessible" /> 
            <LegendItem colorClass="bg-seat-available-senior" iconColorClass="text-seat-available-senior-foreground" icon={UserRound} label="Senior" />
            <LegendItem colorClass="bg-seat-available-age-restricted" iconColorClass="text-seat-available-age-restricted-foreground" icon={ShieldAlert} label="Age Restricted" />
            <LegendItem colorClass="bg-seat-selected" iconColorClass="text-seat-selected-foreground" icon={UserCheck} label="Selected" />
            <LegendItem colorClass="bg-seat-booked" iconColorClass="text-seat-booked-foreground" icon={CheckCircle2} label="Booked" />
            <LegendItem colorClass="bg-seat-broken" iconColorClass="text-seat-broken-foreground" icon={Ban} label="Broken" />
        </div>
      </CardContent>
    </Card>
  );
};
