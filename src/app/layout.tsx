
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from 'next-auth/react'; // Added SessionProvider

const geistSans = Geist({ 
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ 
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CineSeat Pro', 
  description: 'Intelligent movie hall seat booking system.', 
};

export default function RootLayout({
  children,
  pageProps, // NextAuth requires session to be passed if using getServerSideProps, but for App Router, SessionProvider handles it.
}: Readonly<{
  children: React.ReactNode;
  pageProps?: { session?: any }; // Making pageProps optional as it's not always needed for App Router
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider session={pageProps?.session}>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
