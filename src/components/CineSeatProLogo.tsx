import { Ticket } from 'lucide-react';
import type React from 'react';

export const CineSeatProLogo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <Ticket className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold text-primary">Karma Seat</h1>
    </div>
  );
};
