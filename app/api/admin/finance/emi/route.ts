import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createEmiExpenseSchedule } from '@/lib/finance/emi';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schedules = await prisma.expenseEmiSchedule.findMany({
    where: { expense: { status: { not: 'CANCELLED' } } },
    include: {
      expense: {
        include: {
          paidByPartner: { select: { id: true, displayName: true } },
          revenueRecoveries: { orderBy: { recoveredAt: 'desc' } },
        },
      },
      installments: {
        include: {
          partnerObligations: {
            include: {
              partner: { select: { id: true, displayName: true } },
              payableToPartner: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { installmentNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const safeSchedules = JSON.parse(
    JSON.stringify(schedules, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
  );

  return NextResponse.json({ schedules: safeSchedules });
}

const emiSchema = z.object({
  title: z.string().min(2),
  vendor: z.string().optional().nullable(),
  purchasePriceRupees: z.number().positive(),
  downPaymentRupees: z.number().min(0).optional(),
  totalEmiCount: z.number().int().positive(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY']).optional(),
  firstEmiDate: z.string(),
  paidByPartnerId: z.string().min(1),
  notes: z.string().optional().nullable(),
  recoveryMode: z.enum(['PARTNER_SPLIT', 'REVENUE']).optional(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = emiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const adminId = (check.session?.user as any)?.id || 'admin';
    const result = await createEmiExpenseSchedule({
      ...parsed.data,
      firstEmiDate: new Date(parsed.data.firstEmiDate),
      vendor: parsed.data.vendor || undefined,
      notes: parsed.data.notes || undefined,
      createdBy: adminId,
    });

    const safeResult = JSON.parse(
      JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
    );
    return NextResponse.json({ success: true, ...safeResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create EMI schedule' }, { status: 400 });
  }
}

