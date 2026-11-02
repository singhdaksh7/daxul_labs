import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { scanOperationalAlerts } from '@/lib/operations/alerts';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run live scan
  await scanOperationalAlerts();

  const alerts = await prisma.operationalAlert.findMany({
    where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({
    metrics: {
      totalOpen: alerts.length,
      critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
      warning: alerts.filter((a) => a.severity === 'WARNING').length,
    },
    alerts,
  });
}

const updateAlertSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
  assignedTo: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = updateAlertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const alert = await prisma.operationalAlert.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      assignedTo: parsed.data.assignedTo,
      resolvedAt: parsed.data.status === 'RESOLVED' ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, alert });
}

