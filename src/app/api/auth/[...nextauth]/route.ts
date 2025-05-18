
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
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const db = await getDb();
        // Use DbUser for the type from our database
        const user = await db.get<DbUser>('SELECT * FROM users WHERE email = ?', credentials.email);

        if (user && user.hashedPassword && await bcrypt.compare(credentials.password, user.hashedPassword)) {
          // Return an object that will be stored in the JWT
          // This object's shape is what the `user` parameter in the `jwt` callback will receive
          return {
            id: user.id.toString(), // Ensure id is a string
            name: user.name,
            email: user.email,
            role: user.role,
          };
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
      // The `user` object is available on the first sign-in and is the return from the `authorize` callback
      if (user) {
        token.id = user.id; // user.id is already a string from authorize
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // The `token` object contains the properties set in the `jwt` callback
      // We need to ensure `session.user` conforms to our `AuthUser` type
      if (session.user) {
        // Explicitly cast session.user to AuthUser and assign properties from token
        const sUser = session.user as AuthUser;
        if (token.id) sUser.id = token.id as string;
        if (token.role) sUser.role = token.role as 'user' | 'admin';
        if (token.name !== undefined) sUser.name = token.name as string | null; // token.name could be null
        if (token.email) sUser.email = token.email as string;
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
