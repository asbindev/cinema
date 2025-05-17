
import type { Metadata } from 'next';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Film, Users } from 'lucide-react'; // Added Film and Users icons

export const metadata: Metadata = {
  title: 'CineSeat Pro - Admin',
  description: 'Admin panel for CineSeat Pro.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/admin" className="text-2xl font-bold">
            CineSeat Pro Admin
          </Link>
          <nav className="space-x-4">
            {/* Add links for future admin sections here */}
            {/* <Link href="/admin/users" className="hover:underline">Users</Link> */}
            <Button variant="ghost" asChild>
              <Link href="/">Back to Main Site</Link>
            </Button>
          </nav>
        </div>
      </header>
      <div className="flex flex-1 container mx-auto py-8">
        <aside className="w-64 space-y-4 pr-8">
          <h2 className="text-xl font-semibold">Navigation</h2>
          <nav className="flex flex-col space-y-2">
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/admin/movies">
                <Film className="mr-2 h-5 w-5" />
                Movies
              </Link>
            </Button>
            {/* Example for future Users link
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-5 w-5" />
                User Management
              </Link>
            </Button>
            */}
          </nav>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Manage your movie hall settings, movies, and users from here.
          </p>
        </aside>
        <main className="flex-1 pl-8 border-l">
          {children}
        </main>
      </div>
      <footer className="bg-muted text-muted-foreground text-center p-4">
        &copy; {new Date().getFullYear()} CineSeat Pro Admin Panel
      </footer>
    </div>
  );
}
