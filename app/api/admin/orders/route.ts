import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { getOrderDetail, listOrders } from '@/lib/adminQueries';
import { maybeReleaseExpiredReservations } from '@/lib/reservations';
import { createRazorpayRefund } from '@/lib/razorpay';
import { sendDesignProofReadyEmail, sendOrderCancelledEmail } from '@/lib/notifications/email';
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
  await maybeReleaseExpiredReservations(); // throttled, errors swallowed
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
  z.object({
    action: z.literal('cancel'),
    orderId: id,
    note,
    restockInventory: z.boolean().default(true),
    refundAmount: z.number().min(0).optional(),
  }),
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
  z.object({
    action: z.literal('refund'),
    orderId: id,
    amount: z.number().positive(),
    reason: z.string().trim().min(1).max(500),
    triggerGatewayRefund: z.boolean().default(true),
    restockInventory: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('designProof'),
    orderId: id,
    proofImageUrl: z.string().trim().min(1).max(1000).optional(),
    designProofUrl: z.string().trim().min(1).max(1000).optional(),
    designNotes: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
    designStatus: z.string().optional(),
  }),
  z.object({
    action: z.literal('resolveCancellation'),
    orderId: id,
    decision: z.enum(['approved', 'rejected']).optional(),
    approved: z.boolean().optional(),
    reason: z.string().trim().max(500).optional(),
    note,
  }),
]);

export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true },
    });
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
          const r = await tx.order.updateMany({
            where: { id: order.id, status: current },
            data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: body.note || 'Admin cancelled' },
          });
          if (r.count !== 1) return false;
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, status: 'cancelled', adminEmail, note: body.note || `Cancelled from ${current}` },
          });

          // Restock inventory if requested
          if (body.restockInventory) {
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
              await tx.inventoryAdjustment.create({
                data: {
                  productId: item.productId,
                  delta: item.quantity,
                  quantityAfter: 0,
                  reason: 'returned',
                  note: `Restocked on order cancellation #${order.orderNumber}`,
                  adminEmail,
                },
              });
            }
          }
          return true;
        });
        if (!ok) return NextResponse.json({ error: 'Order status changed concurrently; refresh and retry' }, { status: 409 });
        await logAdminAction(g.admin, 'ORDER_CANCEL', 'Order', order.id, { orderNumber: order.orderNumber, from: current });

        sendOrderCancelledEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          reason: body.note,
          refundAmount: body.refundAmount,
        }).catch((e) => console.error('Failed to send cancellation email:', e));

        return NextResponse.json({ success: true, status: 'cancelled' });
      }

      case 'refund': {
        const remainingToRefund = Math.max(0, order.totalAmount - (order.refundedAmount || 0));
        if (body.amount > remainingToRefund + 0.01) {
          return NextResponse.json(
            { error: `Refund amount ₹${body.amount} exceeds remaining refundable total ₹${remainingToRefund}` },
            { status: 400 }
          );
        }

        let gatewayRefundId: string | null = null;
        if (body.triggerGatewayRefund && order.razorpayPaymentId) {
          try {
            const refundRes = await createRazorpayRefund(order.razorpayPaymentId, body.amount, {
              orderId: order.id,
              orderNumber: order.orderNumber,
              reason: body.reason,
            });
            gatewayRefundId = refundRes.id;
          } catch (refundErr: any) {
            return NextResponse.json(
              { error: `Payment gateway refund failed: ${refundErr.message || 'Unknown error'}` },
              { status: 502 }
            );
          }
        }

        const newRefundedAmount = (order.refundedAmount || 0) + body.amount;
        const refundStatus = newRefundedAmount >= order.totalAmount - 0.01 ? 'full' : 'partial';

        await prisma.$transaction(async (tx) => {
          await tx.orderRefund.create({
            data: {
              orderId: order.id,
              amount: body.amount,
              gatewayRefundId,
              reason: body.reason,
              status: 'completed',
              adminEmail,
              restockedInventory: body.restockInventory,
            },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              refundedAmount: newRefundedAmount,
              refundStatus,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              adminEmail,
              note: `Refund of ₹${body.amount.toFixed(2)} processed (${body.reason})${gatewayRefundId ? ` [Gateway ID: ${gatewayRefundId}]` : ''}`,
            },
          });

          if (body.restockInventory) {
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
        });

        await logAdminAction(g.admin, 'ORDER_REFUND', 'Order', order.id, {
          orderNumber: order.orderNumber,
          amount: body.amount,
          gatewayRefundId,
          reason: body.reason,
        });

        return NextResponse.json({
          success: true,
          refundedAmount: newRefundedAmount,
          refundStatus,
          gatewayRefundId,
        });
      }

      case 'designProof': {
        const finalProofUrl = body.proofImageUrl || body.designProofUrl || '';
        const finalNotes = body.designNotes || body.notes || null;
        const finalStatus = body.designStatus || 'proof_uploaded';

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              proofImageUrl: finalProofUrl,
              designProofUrl: finalProofUrl,
              designStatus: finalStatus,
              designNotes: finalNotes,
            },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              adminEmail,
              note: `Custom 3D model proof uploaded for customer review`,
            },
          });
        });

        if (finalProofUrl) {
          sendDesignProofReadyEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            proofUrl: finalProofUrl,
          }).catch((e) => console.error('Failed to send design proof email:', e));
        }

        await logAdminAction(g.admin, 'DESIGN_PROOF_UPLOADED', 'Order', order.id, {
          orderNumber: order.orderNumber,
          proofImageUrl: finalProofUrl,
        });

        return NextResponse.json({ success: true, proofImageUrl: finalProofUrl, designStatus: finalStatus });
      }

      case 'resolveCancellation': {
        const isApproved = body.decision === 'approved' || body.approved === true;
        const reasonText = body.note || body.reason || (isApproved ? 'Cancellation request approved by admin' : 'Cancellation request rejected');

        if (isApproved) {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'cancelled',
                cancellationRequested: false,
                cancelledAt: new Date(),
                cancellationReason: reasonText,
              },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: 'cancelled',
                adminEmail,
                note: `Cancellation request approved: ${reasonText}`,
              },
            });
          });
          sendOrderCancelledEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            reason: reasonText,
          }).catch((e) => console.error('Failed to send cancellation email:', e));
        } else {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: { cancellationRequested: false },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: order.status,
                adminEmail,
                note: `Cancellation request rejected: ${reasonText}`,
              },
            });
          });
        }
        return NextResponse.json({ success: true, cancellationResolved: true, isApproved });
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
