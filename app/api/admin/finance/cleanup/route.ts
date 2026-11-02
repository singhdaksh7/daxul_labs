import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { previewFinanceCleanup, runFinanceCleanup } from '@/lib/finance/cleanup';

export const dynamic = 'force-dynamic';

async function superOnly() {
  const check = await requireAdminSession();
  if (!check.authorized) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  if (check.role !== 'SUPER_ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required' }, { status: 403 }) } as const;
  }
  return { check } as const;
}

/** GET: preview of what a clean-up would touch. Changes nothing. */
export async function GET() {
  const g = await superOnly();
  if ('error' in g) return g.error;
  return NextResponse.json(await previewFinanceCleanup(), { headers: { 'Cache-Control': 'no-store' } });
}

const runSchema = z.object({
  confirm: z.literal('CLEAN UP'),
  keepPartnerIds: z.array(z.string().min(1)).min(1, 'Keep at least one partner'),
});

/** POST: cancel every active expense/EMI (with reversals) and remove partners not in keepPartnerIds. */
export async function POST(req: NextRequest) {
  const g = await superOnly();
  if ('error' in g) return g.error;
  const parsed = runSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Type CLEAN UP to confirm' }, { status: 400 });
  }
  const user = g.check.session.user as { id?: string; email?: string };
  const result = await runFinanceCleanup({ keepPartnerIds: parsed.data.keepPartnerIds, createdBy: user.id || 'admin' });
  await prisma.auditLog
    .create({
      data: {
        adminUserId: user.id ?? null,
        adminUserEmail: user.email ?? 'unknown',
        action: 'FINANCE_CLEANUP',
        entityType: 'Finance',
        details: {
          cancelled: result.cancelled.length,
          blocked: result.blocked.length,
          removedPartners: result.removedPartners,
          deactivatedPartners: result.deactivatedPartners,
        },
      },
    })
    .catch(() => undefined);
  return NextResponse.json({ success: true, ...result });
}
