import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addPartnerCapital, recordPartnerWithdrawal } from '@/lib/finance/capital';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [capitalEntries, withdrawals] = await Promise.all([
    prisma.partnerCapitalEntry.findMany({
      include: { partner: { select: { id: true, displayName: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.partnerWithdrawal.findMany({
      include: { partner: { select: { id: true, displayName: true } } },
      orderBy: { date: 'desc' },
    }),
  ]);

  const safeCapital = capitalEntries.map((c) => ({
    ...c,
    amountPaise: c.amountPaise.toString(),
  }));

  const safeWithdrawals = withdrawals.map((w) => ({
    ...w,
    amountPaise: w.amountPaise.toString(),
  }));

  return NextResponse.json({
    capitalEntries: safeCapital,
    withdrawals: safeWithdrawals,
  });
}

const capitalSchema = z.object({
  partnerId: z.string().min(1),
  amountRupees: z.number().positive(),
  type: z.enum(['CAPITAL_CONTRIBUTION', 'PARTNER_ADVANCE']).optional(),
  method: z.string().optional(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = capitalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const adminId = (check.session?.user as any)?.id || 'admin';
    const entry = await addPartnerCapital({
      ...parsed.data,
      reference: parsed.data.reference || undefined,
      notes: parsed.data.notes || undefined,
      createdBy: adminId,
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        amountPaise: entry.amountPaise.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add capital' }, { status: 400 });
  }
}

