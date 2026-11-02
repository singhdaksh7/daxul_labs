import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canManageEmi } from '@/lib/finance/emiAuth';
import { RecoveryError, recordRevenueRecovery } from '@/lib/finance/recovery';

export const dynamic = 'force-dynamic';

const schema = z.object({
  amountRupees: z.number().positive(),
  recoveredAt: z.string().optional(),
  note: z.string().max(300).optional().nullable(),
});

/** POST: record that the business repaid the paying partner out of revenue (expense or EMI set to REVENUE). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdminSession();
  if (!check.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = check.session.user as { id?: string; email?: string };
  const exp = await prisma.businessExpense.findUnique({ where: { id }, select: { paidByPartnerId: true } });
  if (!exp) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (!(await canManageEmi({ id: user.id, role: check.role }, exp.paidByPartnerId))) {
    return NextResponse.json({ error: 'Only the paying partner or a SUPER_ADMIN can record a recovery' }, { status: 403 });
  }
  try {
    const result = await recordRevenueRecovery({
      expenseId: id,
      amountRupees: parsed.data.amountRupees,
      recoveredAt: parsed.data.recoveredAt ? new Date(parsed.data.recoveredAt) : undefined,
      note: parsed.data.note ?? undefined,
      createdBy: user.id || user.email || 'admin',
    });
    await prisma.auditLog
      .create({
        data: {
          adminUserId: user.id ?? null,
          adminUserEmail: user.email ?? 'unknown',
          action: 'REVENUE_RECOVERY_RECORDED',
          entityType: 'BusinessExpense',
          entityId: id,
          details: { amountRupees: parsed.data.amountRupees },
        },
      })
      .catch(() => undefined);
    return NextResponse.json({ success: true, outstandingPaise: result.outstandingPaise.toString() });
  } catch (err) {
    if (err instanceof RecoveryError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Revenue recovery failed', err);
    return NextResponse.json({ error: 'Failed to record recovery' }, { status: 500 });
  }
}
