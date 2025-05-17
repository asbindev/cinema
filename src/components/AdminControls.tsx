'use client';
import type React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface AdminControlsProps {
  isAdminMode: boolean;
  onToggleAdminMode: (isAdmin: boolean) => void;
}

export const AdminControls: React.FC<AdminControlsProps> = ({ isAdminMode, onToggleAdminMode }) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>Admin Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch
            id="admin-mode"
            checked={isAdminMode}
            onCheckedChange={onToggleAdminMode}
            aria-label="Toggle Admin Mode"
          />
          <Label htmlFor="admin-mode" className="cursor-pointer">Admin Mode (Bypass Rules)</Label>
        </div>
        {isAdminMode && (
          <p className="mt-2 text-sm text-muted-foreground">
            Admin mode enabled. You can manually select any available seats.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
