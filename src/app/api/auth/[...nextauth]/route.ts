
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { User, AuthUser } from '@/lib/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const db = await getDb();
        const user = await db.get<User>('SELECT * FROM users WHERE email = ?', credentials.email);

        if (user && user.hashedPassword && await bcrypt.compare(credentials.password, user.hashedPassword)) {
          // Return an object that will be stored in the JWT
          return {
            id: user.id.toString(), // NextAuth expects id to be string in many contexts
            name: user.name,
            email: user.email,
            role: user.role,
          } as any; // Type assertion can be common due to NextAuth's internal User type
        }
        return null; // Login failed
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist the user role and id to the token right after signin
      // 'user' object is only available on first sign-in or when JWT is created.
      if (user) {
        token.id = user.id; // user.id is already string from authorize
        token.role = (user as any).role; 
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like user id and role from the token.
      if (session.user) {
        const authUser = session.user as AuthUser;
        if (typeof token.id === 'string') {
          authUser.id = token.id;
        }
        if (typeof token.role === 'string') {
          authUser.role = token.role as 'user' | 'admin';
        }
        if (typeof token.name === 'string' || token.name === null) {
            authUser.name = token.name;
        }
        if (typeof token.email === 'string') {
            authUser.email = token.email;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // (optional) Error code passed in query string as ?error=
    // newUser: '/auth/new-user' // (optional) New users will be directed here on first sign in
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

