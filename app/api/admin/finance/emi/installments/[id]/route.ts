import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EmiActionError, markEmiInstallmentPaid } from '@/lib/finance/emi';
import { canManageEmi } from '@/lib/finance/emiAuth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.literal('MARK_PAID'),
  // ISO date the installment was paid to the lender (defaults to now)
  paidAt: z.string().optional(),
});

/** PATCH /api/admin/finance/emi/installments/[id]: mark the installment as paid to the lender. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdminSession();
  if (!check.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = check.session.user as { id?: string; email?: string; role?: string };
  const inst = await prisma.expenseEmiInstallment.findUnique({
    where: { id },
    include: { emiSchedule: { include: { expense: { select: { paidByPartnerId: true } } } } },
  });
  if (!inst) return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
  if (!(await canManageEmi({ id: user.id, role: check.role }, inst.emiSchedule.expense.paidByPartnerId))) {
    return NextResponse.json({ error: 'Only the paying partner or a SUPER_ADMIN can mark installments paid' }, { status: 403 });
  }

  try {
    const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined;
    await markEmiInstallmentPaid({ installmentId: id, paidAt, createdBy: user.id || user.email || 'admin' });
    await prisma.auditLog.create({
      data: {
        adminUserId: user.id ?? null,
        adminUserEmail: user.email ?? 'unknown',
        action: 'EMI_INSTALLMENT_PAID',
        entityType: 'ExpenseEmiInstallment',
        entityId: id,
        details: { installmentNumber: inst.installmentNumber },
      },
    }).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof EmiActionError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('EMI mark paid failed', err);
    return NextResponse.json({ error: 'Failed to mark installment paid' }, { status: 500 });
  }
}
