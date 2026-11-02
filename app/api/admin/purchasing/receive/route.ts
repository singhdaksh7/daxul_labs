import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { receiveGoods } from '@/lib/operations/purchasing';
import { z } from 'zod';

const grnSchema = z.object({
  purchaseOrderId: z.string().min(1),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      purchaseOrderItemId: z.string().min(1),
      materialItemId: z.string().min(1),
      receivedQuantity: z.number().min(0),
      damagedQuantity: z.number().min(0).optional(),
      lotNumber: z.string().optional(),
    }),
  ).min(1),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = check.session.user as { id?: string; email?: string };
  const json = await req.json();
  const parsed = grnSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const result = await receiveGoods({
      ...parsed.data,
      receivedBy: admin.id || 'admin',
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to receive goods' }, { status: 400 });
  }
}

