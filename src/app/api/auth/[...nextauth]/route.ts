
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
              console.log(`Authorize: Authentication successful for ${userFromDb.email}`);
              // Ensure the returned object matches what JWT and session callbacks expect
              return {
                id: userFromDb.id.toString(),
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
          return null;
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
        const authUser = user as AuthUser; // Cast to our specific AuthUser type
        token.id = authUser.id;
        token.role = authUser.role; // Use the role from the user object
        token.name = authUser.name;
        token.email = authUser.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sUser = session.user as AuthUser;
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
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
