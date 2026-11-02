import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EmiActionError, receiveEmiObligationPayment } from '@/lib/finance/emi';
import { canManageEmi } from '@/lib/finance/emiAuth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  amountRupees: z.number().positive().optional(),
  paymentMethod: z.string().max(40).optional(),
  referenceNumber: z.string().max(120).optional().nullable(),
});

/** POST: record that a partner has paid their EMI share to the paying partner (verified immediately). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdminSession();
  if (!check.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = check.session.user as { id?: string; email?: string };
  const obl = await prisma.partnerEmiObligation.findUnique({ where: { id }, select: { payableToPartnerId: true } });
  if (!obl) return NextResponse.json({ error: 'Obligation not found' }, { status: 404 });
  if (!(await canManageEmi({ id: user.id, role: check.role }, obl.payableToPartnerId))) {
    return NextResponse.json({ error: 'Only the partner being repaid or a SUPER_ADMIN can record this payment' }, { status: 403 });
  }

  try {
    const result = await receiveEmiObligationPayment({
      obligationId: id,
      amountRupees: parsed.data.amountRupees,
      paymentMethod: parsed.data.paymentMethod,
      referenceNumber: parsed.data.referenceNumber ?? undefined,
      actorUserId: user.id || user.email || 'admin',
      actorRole: check.role,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof EmiActionError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('EMI receive failed', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to record payment' }, { status: 400 });
  }
}
