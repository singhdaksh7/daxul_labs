import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processDueNotificationJobs } from '@/lib/retention/automation';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [automations, templates, recentJobs] = await Promise.all([
    prisma.notificationAutomation.findMany({
      include: { template: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    }),
    prisma.notificationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  return NextResponse.json({
    automations,
    templates,
    recentJobs,
  });
}

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger worker run manually from Admin Studio OS
  const results = await processDueNotificationJobs(20);
  return NextResponse.json({ success: true, processed: results });
}

