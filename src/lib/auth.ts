import { getServerSession, type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './prisma';
import { AppError, rateLimit } from './security';
import type { Role } from '@prisma/client';
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email || !credentials?.password || credentials.password.length > 72) return null;
        await rateLimit(`login:${email}`, 20);
        const u = await db.user.findUnique({ where: { email } });
        const valid = await compare(
          credentials.password,
          u?.passwordHash ?? '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6ntb5J28MiKdt4UyG7ixE9jXXjB7P4G',
        );
        if (!u || !valid || u.status !== 'ACTIVE') return null;
        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role,
          sessionVersion: u.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.version = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
        session.user.sessionVersion = token.version as number;
      }
      return session;
    },
  },
};
export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await db.user.findUnique({ where: { id: session.user.id } });
  return u?.status === 'ACTIVE' && u.sessionVersion === session.user.sessionVersion ? u : null;
}
export async function requireUser(role?: Role) {
  const user = await currentUser();
  if (!user) throw new AppError('Please sign in to continue.', 401);
  if (role && user.role !== role) throw new AppError('You do not have permission to do this.', 403);
  return user;
}
