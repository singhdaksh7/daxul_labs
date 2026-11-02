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
    include: {
      expense: {
        include: { paidByPartner: { select: { id: true, displayName: true } } },
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

  const safeSchedules = schedules.map((s) => ({
    ...s,
    purchasePricePaise: s.purchasePricePaise.toString(),
    downPaymentPaise: s.downPaymentPaise.toString(),
    financedAmountPaise: s.financedAmountPaise.toString(),
    installments: s.installments.map((inst) => ({
      ...inst,
      amountPaise: inst.amountPaise.toString(),
      amountPaidPaise: inst.amountPaidPaise.toString(),
      partnerObligations: inst.partnerObligations.map((o) => ({
        ...o,
        shareAmountPaise: o.shareAmountPaise.toString(),
        amountPaidPaise: o.amountPaidPaise.toString(),
        remainingPaise: o.remainingPaise.toString(),
      })),
    })),
  }));

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

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create EMI schedule' }, { status: 400 });
  }
}

