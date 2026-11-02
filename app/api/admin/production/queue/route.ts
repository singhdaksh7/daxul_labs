import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getProductionCapacityMetrics } from '@/lib/operations/scheduling';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [capacity, tickets] = await Promise.all([
    getProductionCapacityMetrics(),
    prisma.productionJobTicket.findMany({
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true } },
        printer: { select: { id: true, name: true, model: true } },
        spool: { select: { id: true, spoolNumber: true, colorName: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  return NextResponse.json({
    capacity,
    tickets,
  });
}

