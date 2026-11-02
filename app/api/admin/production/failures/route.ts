import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recordPrintFailure, createReprintJobTicket } from '@/lib/operations/failures';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const failures = await prisma.printFailure.findMany({
    include: {
      jobTicket: {
        select: { id: true, ticketNumber: true, orderId: true },
      },
      printer: { select: { id: true, name: true } },
      spool: { select: { id: true, spoolNumber: true, colorName: true, materialType: true } },
    },
    orderBy: { failedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ failures });
}

const failureSchema = z.object({
  jobTicketId: z.string().min(1),
  printerId: z.string().optional().nullable(),
  spoolId: z.string().optional().nullable(),
  failureReason: z.string().min(2),
  wastedGrams: z.number().min(0),
  wastedMinutes: z.number().min(0),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = check.session.user as { id?: string; email?: string };
  const json = await req.json();
  const parsed = failureSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const failure = await recordPrintFailure({
      ...parsed.data,
      operatorId: admin.id || 'admin',
    });
    return NextResponse.json({ success: true, failure });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record failure' }, { status: 400 });
  }
}

