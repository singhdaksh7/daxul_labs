import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

// Simple in-memory rate limiting map for credential login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    loginAttempts.set(key, { count: 1, resetTime: now + LOCKOUT_MS });
    return true;
  }

  if (now > record.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + LOCKOUT_MS });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

const isProduction = process.env.NODE_ENV === 'production';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours safe session expiration
  },
  useSecureCookies: isProduction,
  cookies: {
    sessionToken: {
      name: isProduction ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: isProduction ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  providers: [
    CredentialsProvider({
      name: 'DAXUL Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid email or password.');
        }

        const emailClean = credentials.email.toLowerCase().trim();

        // Rate limit check to prevent brute-force attacks
        if (!checkRateLimit(emailClean)) {
          throw new Error('Too many login attempts. Please try again after 15 minutes.');
        }

        const user = await prisma.user.findUnique({
          where: { email: emailClean },
        });

        // Do not leak email existence: return generic invalid message
        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Invalid email or password.');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'daxul_labs_super_secret_jwt_key_2026',
};

export async function getAuthSession() {
  return await getServerSession(authOptions);
}

export async function requireAdminSession() {
  const session = await getAuthSession();

  if (!session || !session.user) {
    return { authorized: false, reason: 'Unauthenticated', session: null };
  }

  const role = (session.user as any).role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return { authorized: false, reason: 'Forbidden: Admin role required', session };
  }

  return { authorized: true, reason: 'Authorized', session };
}

export async function requireAdmin() {
  const { authorized, reason, session } = await requireAdminSession();
  if (!authorized || !session) {
    throw new Error(reason || 'Unauthorized: Admin privileges required');
  }
  return session;
}
