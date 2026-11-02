import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculatePeriodProfit, lockAndDistributeProfitPeriod } from '@/lib/finance/profit';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const periods = await prisma.profitPeriod.findMany({
    include: {
      allocations: {
        include: { partner: { select: { id: true, displayName: true } } },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  const safePeriods = periods.map((p) => ({
    ...p,
    totalRevenuePaise: p.totalRevenuePaise.toString(),
    totalRefundsPaise: p.totalRefundsPaise.toString(),
    totalCogsPaise: p.totalCogsPaise.toString(),
    operatingExpensePaise: p.operatingExpensePaise.toString(),
    grossProfitPaise: p.grossProfitPaise.toString(),
    netDistributablePaise: p.netDistributablePaise.toString(),
    allocations: p.allocations.map((a) => ({
      ...a,
      allocatedAmountPaise: a.allocatedAmountPaise.toString(),
      withdrawnAmountPaise: a.withdrawnAmountPaise.toString(),
    })),
  }));

  return NextResponse.json({ periods: safePeriods });
}

const createPeriodSchema = z.object({
  periodName: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = createPeriodSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const period = await prisma.profitPeriod.create({
    data: {
      periodName: parsed.data.periodName,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      notes: parsed.data.notes,
      status: 'OPEN',
    },
  });

  // Calculate preliminary profit
  const calculated = await calculatePeriodProfit(period.id);

  return NextResponse.json({
    success: true,
    period: {
      ...calculated,
      totalRevenuePaise: calculated.totalRevenuePaise.toString(),
      totalRefundsPaise: calculated.totalRefundsPaise.toString(),
      totalCogsPaise: calculated.totalCogsPaise.toString(),
      operatingExpensePaise: calculated.operatingExpensePaise.toString(),
      grossProfitPaise: calculated.grossProfitPaise.toString(),
      netDistributablePaise: calculated.netDistributablePaise.toString(),
    },
  });
}

const lockPeriodSchema = z.object({
  periodId: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (check.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required to lock profit periods' }, { status: 403 });
  }

  const json = await req.json();
  const parsed = lockPeriodSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const adminId = (check.session?.user as any)?.id || 'admin';
    const result = await lockAndDistributeProfitPeriod({
      periodId: parsed.data.periodId,
      lockedBy: adminId,
    });
    return NextResponse.json({ ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to lock period' }, { status: 400 });
  }
}

