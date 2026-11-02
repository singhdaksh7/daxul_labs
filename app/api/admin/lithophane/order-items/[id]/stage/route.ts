import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { LITHOPHANE_STAGE_KEYS, stageLabel } from '@/lib/lithophane';

export const dynamic = 'force-dynamic';

const schema = z.object({
  stage: z.enum(LITHOPHANE_STAGE_KEYS as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

/** PATCH /api/admin/lithophane/order-items/[id]/stage: move a custom lithophane through its workflow. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const { id } = await params;
  const p = await parseBody(req, schema);
  if (!p.ok) return p.response;
  try {
    const item = await prisma.orderItem.findUnique({ where: { id }, select: { id: true, orderId: true, lithophaneSnapshot: true, lithophaneStage: true, order: { select: { status: true } } } });
    if (!item || !item.lithophaneSnapshot) return NextResponse.json({ error: 'Lithophane order item not found' }, { status: 404 });
    const from = item.lithophaneStage ?? 'new_order';
    await prisma.$transaction([
      prisma.orderItem.update({ where: { id }, data: { lithophaneStage: p.data.stage } }),
      // Reuses the order history table without touching the order's ManufacturingStatus.
      prisma.orderStatusHistory.create({
        data: {
          orderId: item.orderId,
          status: item.order.status,
          adminEmail: g.admin.email,
          note: `Lithophane stage: ${stageLabel(from)} -> ${stageLabel(p.data.stage)}${p.data.note ? ` (${p.data.note})` : ''}`,
        },
      }),
    ]);
    await logAdminAction(g.admin, 'lithophane.stage.update', 'OrderItem', id, { orderId: item.orderId, from, to: p.data.stage });
    return NextResponse.json({ success: true, stage: p.data.stage });
  } catch (err) {
    return serverError(err, 'Admin PATCH lithophane stage:');
  }
}
