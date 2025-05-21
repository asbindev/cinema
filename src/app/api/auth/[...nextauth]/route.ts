
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { User as DbUser, AuthUser } from '@/lib/types'; // Renamed User to DbUser to avoid conflict with NextAuth User type

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Authorize attempt for:", credentials?.email);
        try {
          if (!credentials?.email || !credentials.password) {
            console.warn("Authorize: Missing credentials.");
            return null;
          }

          const db = await getDb();
          const userFromDb = await db.get<DbUser>('SELECT * FROM users WHERE email = ?', credentials.email);

          if (userFromDb && userFromDb.hashedPassword) {
            const passwordsMatch = await bcrypt.compare(credentials.password, userFromDb.hashedPassword);
            if (passwordsMatch) {
              console.log(`Authorize: Authentication successful for ${userFromDb.email}, role: ${userFromDb.role}`);
              // Ensure the returned object matches what JWT and session callbacks expect
              return {
                id: userFromDb.id.toString(), // NextAuth expects id as string for JWT
                name: userFromDb.name,
                email: userFromDb.email,
                role: userFromDb.role, // This role comes from the database
              };
            } else {
              console.warn(`Authorize: Password mismatch for ${credentials.email}`);
            }
          } else {
            console.warn(`Authorize: User ${credentials.email} not found or has no password.`);
          }
          return null; // Login failed
        } catch (error) {
          console.error("Authorize error during authentication process:", error);
          return null; // Crucial to return null on error
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // The 'user' object here is the one returned by the 'authorize' callback
      if (user) {
        // This is the initial sign-in
        token.id = user.id; // id is already string from authorize
        token.role = (user as AuthUser).role; 
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Token contains what we put in it in the jwt callback
      if (session.user) {
         const sUser = session.user as AuthUser; // Cast to ensure type safety
        if (token.id) sUser.id = token.id as string;
        if (token.role) sUser.role = token.role as 'user' | 'admin';
        if (token.name !== undefined) sUser.name = token.name as string | null;
        if (token.email) sUser.email = token.email as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    // signOut: '/auth/signout', // Optional: custom signout page
    // error: '/auth/error', // Optional: Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // Optional: (e.g. check your email)
    // newUser: '/auth/new-user' // Optional: New users will be directed here on first sign in
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // Enable debug messages in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
