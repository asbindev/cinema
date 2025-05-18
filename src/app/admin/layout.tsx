
'use client'; // Required for using hooks like useSession and redirect

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Film, Users, LogOut, UserCircle, Home } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { redirect, usePathname } from 'next/navigation';
import { CineSeatProLogo } from '@/components/CineSeatProLogo';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuthUser } from '@/lib/types';


export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === 'loading') {
    return (
        <div className="min-h-screen flex flex-col">
         <header className="bg-primary text-primary-foreground p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
              <Link href="/admin" className="text-2xl font-bold">
                <CineSeatProLogo /> Admin
              </Link>
              <Skeleton className="h-8 w-24" />
            </div>
          </header>
          <div className="flex flex-1 container mx-auto py-8">
            <aside className="w-64 space-y-4 pr-8">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full mb-2" />
              <Separator />
              <Skeleton className="h-16 w-full" />
            </aside>
            <main className="flex-1 pl-8 border-l">
              <Skeleton className="h-screen w-full" />
            </main>
          </div>
           <footer className="bg-muted text-muted-foreground text-center p-4">
             &copy; {new Date().getFullYear()} CineSeat Pro Admin Panel
           </footer>
        </div>
    );
  }

  // If unauthenticated, or if session/user is somehow missing even if status isn't 'loading'
  if (status === 'unauthenticated' || !session || !session.user) {
    const callbackUrl = encodeURIComponent(pathname || '/admin');
    redirect(`/login?callbackUrl=${callbackUrl}`);
    return null; // redirect will handle it, this line is for type safety and to stop further rendering.
  }
  
  // At this point, status is 'authenticated' and session & session.user exist.
  const authUser = session.user as AuthUser;

  // Optional: Check for admin role if you have one
  // if (authUser.role !== 'admin') {
  //   redirect('/'); // Or a "not authorized" page
  //   return null;
  // }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/admin" className="text-2xl font-bold">
            <CineSeatProLogo /> Admin
          </Link>
          <nav className="space-x-4 flex items-center">
            {authUser.email && (
              <span className="text-sm flex items-center">
                <UserCircle className="mr-1.5 h-5 w-5" /> {authUser.email}
              </span>
            )}
            <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="mr-2 h-5 w-5" /> Logout
            </Button>
          </nav>
        </div>
      </header>
      <div className="flex flex-1 container mx-auto py-8">
        <aside className="w-64 space-y-4 pr-8">
          <h2 className="text-xl font-semibold">Navigation</h2>
          <nav className="flex flex-col space-y-2">
            <Button variant={pathname === '/admin/movies' ? "secondary" : "ghost"} className="justify-start" asChild>
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
            <Separator />
             <Button variant="outline" className="justify-start" asChild>
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Back to Main Site
              </Link>
            </Button>
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
