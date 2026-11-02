import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createSupplier, createPurchaseOrder, receiveGoods } from '@/lib/operations/purchasing';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [suppliers, purchaseOrders] = await Promise.all([
    prisma.supplier.findMany({
      include: {
        materials: { include: { materialItem: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { materialItem: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return NextResponse.json({ suppliers, purchaseOrders });
}

const poSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      materialItemId: z.string().min(1),
      orderedQuantity: z.number().positive(),
      unitCost: z.number().min(0),
      taxPercent: z.number().min(0).optional(),
    }),
  ).min(1),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = poSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const po = await createPurchaseOrder(parsed.data);
    return NextResponse.json({ success: true, po });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create PO' }, { status: 400 });
  }
}

