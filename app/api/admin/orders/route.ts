import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { getOrderDetail, listOrders } from '@/lib/adminQueries';
import {
  ORDER_FILTERS,
  canCancel,
  isSafeHttpsUrl,
  nextStatus,
  prevStatus,
  type OrderFilter,
  type OrderStatus,
} from '@/lib/orderPipeline';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    if (id) {
      const detail = await getOrderDetail(id);
      if (!detail) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      return NextResponse.json({ success: true, ...detail });
    }
    const f = sp.get('filter') ?? 'all';
    const filter: OrderFilter = (ORDER_FILTERS as readonly string[]).includes(f) ? (f as OrderFilter) : 'all';
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const result = await listOrders({ filter, search: sp.get('q') ?? undefined, page });
    return NextResponse.json({ success: true, ...result, page });
  } catch (err) {
    return serverError(err, 'Admin GET Orders Error:');
  }
}

const id = z.string().min(1).max(64);
const note = z.string().trim().max(1000).optional();

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('move'), orderId: id, direction: z.enum(['next', 'prev']), note }),
  z.object({ action: z.literal('cancel'), orderId: id, note }),
  z.object({
    action: z.literal('note'),
    orderId: id,
    field: z.enum(['internalNotes', 'qcNotes']),
    text: z.string().trim().min(1).max(2000),
  }),
  z.object({
    action: z.literal('shipping'),
    orderId: id,
    courierName: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
    trackingUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || isSafeHttpsUrl(v), 'Tracking URL must be a valid https:// URL')
      .optional(),
  }),
  z.object({ action: z.literal('payment'), orderId: id, paymentStatus: z.enum(['paid', 'pending', 'failed']) }),
]);

export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const current = order.status as OrderStatus;
    const adminEmail = g.admin.email;

    switch (body.action) {
      case 'move': {
        const target = body.direction === 'next' ? nextStatus(current) : prevStatus(current);
        if (!target) {
          return NextResponse.json({ error: `No ${body.direction} step available from ${current}` }, { status: 400 });
        }
        if (target === 'shipped' && !(order.courierName?.trim() && order.trackingNumber?.trim())) {
          return NextResponse.json(
            { error: 'Courier name and tracking number are required before marking as shipped' },
            { status: 400 },
          );
        }
        const updated = await prisma.$transaction(async (tx) => {
          // optimistic concurrency: only move if the status is still what we validated
          const r = await tx.order.updateMany({ where: { id: order.id, status: current }, data: { status: target } });
          if (r.count !== 1) return null;
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, status: target, adminEmail, note: body.note || `Moved from ${current} to ${target}` },
          });
          return target;
        });
        if (!updated) return NextResponse.json({ error: 'Order status changed concurrently; refresh and retry' }, { status: 409 });
        await logAdminAction(g.admin, 'ORDER_STATUS_CHANGE', 'Order', order.id, {
          orderNumber: order.orderNumber, from: current, to: target,
        });
        return NextResponse.json({ success: true, status: target });
      }

      case 'cancel': {
        if (!canCancel(current)) {
          return NextResponse.json({ error: `Cannot cancel an order that is ${current}` }, { status: 400 });
        }
        const ok = await prisma.$transaction(async (tx) => {
          const r = await tx.order.updateMany({ where: { id: order.id, status: current }, data: { status: 'cancelled' } });
          if (r.count !== 1) return false;
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, status: 'cancelled', adminEmail, note: body.note || `Cancelled from ${current}` },
          });
          return true;
        });
        if (!ok) return NextResponse.json({ error: 'Order status changed concurrently; refresh and retry' }, { status: 409 });
        await logAdminAction(g.admin, 'ORDER_CANCEL', 'Order', order.id, { orderNumber: order.orderNumber, from: current });
        return NextResponse.json({ success: true, status: 'cancelled' });
      }

      case 'note': {
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const line = `[${stamp} UTC · ${adminEmail}] ${body.text}`;
        const existing = order[body.field];
        const value = existing ? `${existing}\n${line}` : line;
        await prisma.order.update({ where: { id: order.id }, data: { [body.field]: value } });
        await logAdminAction(g.admin, 'ORDER_NOTE_ADDED', 'Order', order.id, {
          orderNumber: order.orderNumber, field: body.field, length: body.text.length,
        });
        return NextResponse.json({ success: true, [body.field]: value });
      }

      case 'shipping': {
        const data: Record<string, string | null> = {};
        if (body.courierName !== undefined) data.courierName = body.courierName || null;
        if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null;
        if (body.trackingUrl !== undefined) data.trackingUrl = body.trackingUrl || null;
        if (Object.keys(data).length === 0) {
          return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }
        const updated = await prisma.order.update({
          where: { id: order.id },
          data,
          select: { courierName: true, trackingNumber: true, trackingUrl: true },
        });
        await logAdminAction(g.admin, 'ORDER_SHIPPING_UPDATE', 'Order', order.id, {
          orderNumber: order.orderNumber,
          previous: { courierName: order.courierName, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl },
          next: updated,
        });
        return NextResponse.json({ success: true, ...updated });
      }

      case 'payment': {
        await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: body.paymentStatus } });
        await logAdminAction(g.admin, 'ORDER_PAYMENT_STATUS_CHANGE', 'Order', order.id, {
          orderNumber: order.orderNumber, from: order.paymentStatus, to: body.paymentStatus,
        });
        return NextResponse.json({ success: true, paymentStatus: body.paymentStatus });
      }
    }
  } catch (err) {
    return serverError(err, 'Admin PATCH Order Error:');
  }
}
