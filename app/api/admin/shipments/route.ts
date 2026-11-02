import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dispatchOrderShipment } from '@/lib/operations/shipping';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shipments = await prisma.shipmentTracking.findMany({
    include: {
      order: { select: { id: true, orderNumber: true, customerName: true, totalAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ shipments });
}

const dispatchSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(6),
  weightGrams: z.number().positive(),
  isCod: z.boolean(),
  totalAmount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = dispatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const shipment = await dispatchOrderShipment(parsed.data);
    return NextResponse.json({ success: true, shipment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to dispatch shipment' }, { status: 400 });
  }
}

