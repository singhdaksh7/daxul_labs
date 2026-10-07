import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import type { ZodType } from 'zod';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Guard =
  | { ok: true; session: Session; admin: { id: string | null; email: string } }
  | { ok: false; response: NextResponse };

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Same-origin check (CSRF defence in depth on top of SameSite=Lax + JSON bodies).
 * Rejects when an Origin header is present and its host is not the request host (Host / X-Forwarded-Host)
 * or the NEXTAUTH_URL host. A missing Origin is allowed (non-browser clients, same-origin GETs); the
 * session cookie is the credential. Origin "null" (sandboxed iframes, redirects) is rejected.
 */
export function isSameOriginRequest(input: {
  origin?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  nextauthUrl?: string | null;
}): boolean {
  const origin = input.origin;
  if (origin === undefined || origin === null || origin === '') return true;
  const originHost = hostOf(origin);
  if (!originHost) return false;
  const allowed = [input.host, input.forwardedHost?.split(',')[0], input.nextauthUrl]
    .map((v) => hostOf(v?.trim()))
    .filter((v): v is string => !!v);
  return allowed.includes(originHost);
}

async function sameOriginOk(req?: Request): Promise<boolean> {
  try {
    if (req) {
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
      return isSameOriginRequest({
        origin: req.headers.get('origin'),
        host: req.headers.get('host'),
        forwardedHost: req.headers.get('x-forwarded-host'),
        nextauthUrl: process.env.NEXTAUTH_URL,
      });
    }
    // No request passed (legacy call sites): use the ambient request headers. Browsers always send
    // Origin on cross-origin and non-GET requests, so checking whenever it is present is sufficient.
    const { headers } = await import('next/headers');
    const h = await headers();
    return isSameOriginRequest({
      origin: h.get('origin'),
      host: h.get('host'),
      forwardedHost: h.get('x-forwarded-host'),
      nextauthUrl: process.env.NEXTAUTH_URL,
    });
  } catch {
    return true; // outside a request scope (e.g. unit tests); nothing to compare
  }
}

/**
 * Server-side ADMIN / SUPER_ADMIN guard for every /api/admin/* handler.
 * Usage: const g = await guardAdmin(req?); if (!g.ok) return g.response;
 * Re-reads the user's role from PostgreSQL on every call (see requireAdminSession) and rejects
 * cross-origin browser requests (403).
 */
export async function guardAdmin(req?: Request): Promise<Guard> {
  if (!(await sameOriginOk(req))) {
    return { ok: false, response: NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 }) };
  }
  const { authorized, reason, session } = await requireAdminSession();
  if (!authorized || !session) {
    const status = reason === 'Unauthenticated' ? 401 : 403;
    return { ok: false, response: NextResponse.json({ error: reason }, { status }) };
  }
  const user = session.user as { id?: string; email?: string | null };
  return { ok: true, session, admin: { id: user.id ?? null, email: user.email ?? 'unknown' } };
}

/** Parse + validate a JSON body with Zod. Returns a 400 response on failure (no internals leaked). */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Validation failed', issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

/**
 * Central audit trail (AuditLog table, shown at /admin/audit).
 * NEVER pass passwords, tokens, secrets or customer file contents in `details`.
 */
export async function logAdminAction(
  admin: { id: string | null; email: string },
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        adminUserEmail: admin.email,
        action,
        entityType,
        entityId: entityId ?? null,
        details: (details ?? undefined) as any,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', action, err);
  }
}

export function serverError(err: unknown, label: string) {
  console.error(label, err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
