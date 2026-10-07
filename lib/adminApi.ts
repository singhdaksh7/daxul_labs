import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import type { ZodType } from 'zod';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Guard =
  | { ok: true; session: Session; admin: { id: string | null; email: string } }
  | { ok: false; response: NextResponse };

/**
 * Server-side ADMIN / SUPER_ADMIN guard for every /api/admin/* handler.
 * Usage: const g = await guardAdmin(); if (!g.ok) return g.response;
 */
export async function guardAdmin(): Promise<Guard> {
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
