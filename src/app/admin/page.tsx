
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Film, Users, LayoutDashboard, Ticket } from 'lucide-react'; // Added Ticket icon

export const metadata: Metadata = {
  title: 'Admin Dashboard - Karma Seat',
  description: 'Welcome to the Karma Seat Admin Dashboard.',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Welcome to the Karma Seat administration panel. Manage your application settings from here.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Film className="mr-2 h-6 w-6 text-primary" />
              Movie Management
            </CardTitle>
            <CardDescription>
              Add, edit, and manage movies available in your hall.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/movies">Go to Movies</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ticket className="mr-2 h-6 w-6 text-primary" />
              View Bookings
            </CardTitle>
            <CardDescription>
              View all customer bookings and seat reservations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/bookings">View Bookings</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder for User Management */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow opacity-50 cursor-not-allowed">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-6 w-6 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user accounts and roles (coming soon).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              Manage Users
            </Button>
          </CardContent>
        </Card>
        
        {/* Placeholder for Hall/Seat Configuration */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow opacity-50 cursor-not-allowed">
          <CardHeader>
            <CardTitle className="flex items-center">
              <LayoutDashboard className="mr-2 h-6 w-6 text-primary" />
              Hall Configuration
            </CardTitle>
            <CardDescription>
              Configure seat layouts and screening schedules (coming soon).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              Configure Hall
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
