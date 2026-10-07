import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import {
  checkLoginAllowed,
  cleanupOldAttempts,
  clientIpFromHeaders,
  normalizeEmail,
  recordLoginFailure,
  recordLoginSuccess,
} from './loginLimiter';

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const RATE_LIMIT_ERROR = 'Too many login attempts. Please try again after 15 minutes.';

// Compared against when the user does not exist, so response time does not reveal account existence.
let dummyHash: string | null = null;
function getDummyHash(): string {
  if (!dummyHash) dummyHash = bcrypt.hashSync('dummy-password-for-timing-equalisation', 12);
  return dummyHash;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Credentials login with PostgreSQL-backed throttling (see lib/loginLimiter.ts).
 * Exported for unit tests. Fails CLOSED: if the limiter/DB is unavailable the login is denied.
 */
export async function authorizeCredentials(
  credentials: Record<string, string> | undefined,
  req?: { headers?: unknown },
) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const emailKey = normalizeEmail(credentials.email);
  const ipKey = clientIpFromHeaders(req?.headers);

  try {
    const decision = await checkLoginAllowed(emailKey, ipKey);
    if (!decision.allowed) {
      throw new Error(RATE_LIMIT_ERROR);
    }
    if (decision.delayMs > 0) await sleep(decision.delayMs);

    const user = await prisma.user.findUnique({ where: { email: emailKey } });

    // Always run one bcrypt compare (dummy hash when the user is missing) to equalise timing.
    const hash = user?.passwordHash || getDummyHash();
    const valid = await bcrypt.compare(String(credentials.password).slice(0, 1024), hash);

    if (!user || !user.passwordHash || !valid) {
      await recordLoginFailure(emailKey, ipKey);
      void cleanupOldAttempts();
      throw new Error(GENERIC_LOGIN_ERROR);
    }

    await recordLoginSuccess(emailKey, ipKey);
    void cleanupOldAttempts();

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch (err) {
    if (err instanceof Error && (err.message === GENERIC_LOGIN_ERROR || err.message === RATE_LIMIT_ERROR)) {
      throw err;
    }
    // DB/limiter failure: deny (fail closed) without leaking internals.
    console.error('Login authorize failed closed:', err);
    throw new Error(GENERIC_LOGIN_ERROR);
  }
}

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
      async authorize(credentials, req) {
        return authorizeCredentials(credentials as Record<string, string> | undefined, req as { headers?: unknown });
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
    // Only same-origin redirects after sign-in/out (blocks open redirects via callbackUrl).
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        /* fall through */
      }
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getAuthSession() {
  return await getServerSession(authOptions);
}

export type AdminCheck =
  | { authorized: true; reason: 'Authorized'; session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>; role: 'ADMIN' | 'SUPER_ADMIN' }
  | { authorized: false; reason: string; session: Awaited<ReturnType<typeof getAuthSession>> };

/**
 * Re-reads the user from PostgreSQL on EVERY call (nothing cached across requests), so a deleted or
 * demoted admin loses access immediately instead of when the 24h JWT expires. The User model has no
 * "disabled" flag, so a missing user or a non-admin role is treated as revoked.
 *
 *  - no session, or user no longer exists  -> reason 'Unauthenticated' (guardAdmin: 401)
 *  - user exists but role is not ADMIN/SUPER_ADMIN -> 'Forbidden: Admin role required' (403)
 * The role used is the DB role, never the one stored in the JWT.
 * A DB failure denies access (fail closed).
 */
export async function requireAdminSession(): Promise<AdminCheck> {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!session || !sessionUser?.id) {
    return { authorized: false, reason: 'Unauthenticated', session: null };
  }

  let dbUser: { id: string; email: string; role: string } | null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, role: true },
    });
  } catch (err) {
    console.error('requireAdminSession: user lookup failed (denying)', err);
    return { authorized: false, reason: 'Forbidden: Admin role required', session };
  }

  if (!dbUser) {
    return { authorized: false, reason: 'Unauthenticated', session: null };
  }
  if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
    return { authorized: false, reason: 'Forbidden: Admin role required', session };
  }

  // Reflect the DB truth in the session object handed to handlers.
  (session.user as any).role = dbUser.role;
  (session.user as any).email = dbUser.email;
  return { authorized: true, reason: 'Authorized', session, role: dbUser.role };
}

export async function requireAdmin() {
  const { authorized, reason, session } = await requireAdminSession();
  if (!authorized || !session) {
    throw new Error(reason || 'Unauthorized: Admin privileges required');
  }
  return session;
}
