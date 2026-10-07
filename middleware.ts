import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Edge-style JWT gate only: it cannot query PostgreSQL, so it trusts the role claim in the token
 * (up to 24h stale). The authoritative check is DB-backed and runs in every /api/admin handler
 * (guardAdmin -> requireAdminSession) and in app/admin/(studio)/layout.tsx, which re-read the user's
 * role on each request. Do not rely on this middleware alone.
 * Note: the matcher covers /admin pages only; /api/admin/** is protected by the handlers' guardAdmin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      // Fail closed: never authenticate against a predictable fallback secret.
      console.error('NEXTAUTH_SECRET is not set; refusing admin access.');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const token = await getToken({ req: request, secret });

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (token as any).role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin authorization required' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
