import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getProductionCapacityMetrics } from '@/lib/operations/scheduling';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [capacity, alerts, readyToPackOrders, printingTickets] = await Promise.all([
    getProductionCapacityMetrics(),
    prisma.operationalAlert.findMany({
      where: { status: 'OPEN' },
      take: 10,
      orderBy: { severity: 'desc' },
    }),
    prisma.order.findMany({
      where: { status: 'qc' },
      select: { id: true, orderNumber: true, customerName: true, totalAmount: true },
      take: 10,
    }),
    prisma.productionJobTicket.findMany({
      where: { status: 'PRINTING' },
      include: {
        printer: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ]);

  return NextResponse.json({
    date: new Date().toISOString(),
    capacity,
    criticalAlertsCount: alerts.filter((a) => a.severity === 'CRITICAL').length,
    activeAlerts: alerts,
    readyToPackOrders,
    printingTickets,
  });
}

