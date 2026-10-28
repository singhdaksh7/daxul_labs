import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

function phonesMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  if (da.length < 7 || db.length < 7) return false;
  return da.slice(-10) === db.slice(-10);
}

const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cancel_request'),
    reason: z.string().trim().min(3).max(500),
    verify: z.string().trim().optional(),
  }),
  z.object({
    type: z.literal('approve_design'),
    verify: z.string().trim().optional(),
  }),
  z.object({
    type: z.literal('request_design_changes'),
    feedback: z.string().trim().min(3).max(1000),
    verify: z.string().trim().optional(),
  }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const cleanNumber = orderNumber.trim().toUpperCase();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = actionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid action payload' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanNumber },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Security & Authorization
    const session = await getAuthSession();
    const sessionEmail = session?.user?.email?.toLowerCase();
    const sessionRole = (session?.user as any)?.role;
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

    const verifyVal = parsed.data.verify?.trim() || '';
    const isOwner =
      sessionEmail && sessionEmail === order.customerEmail.toLowerCase();
    const isVerifiedGuest =
      verifyVal &&
      (verifyVal.toLowerCase() === order.customerEmail.toLowerCase() ||
        phonesMatch(verifyVal, order.customerPhone));

    if (!isAdmin && !isOwner && !isVerifiedGuest) {
      return NextResponse.json(
        { error: 'Unauthorized to perform actions on this order.' },
        { status: 403 }
      );
    }

    const body = parsed.data;

    switch (body.type) {
      case 'cancel_request': {
        if (order.status === 'cancelled') {
          return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
        }
        if (order.status === 'shipped' || order.status === 'delivered') {
          return NextResponse.json(
            { error: 'Dispatched orders cannot be cancelled. You may request a return upon delivery.' },
            { status: 400 }
          );
        }

        // If order hasn't entered production yet, it can be cancelled directly
        if (order.status === 'new' || order.status === 'design_pending') {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'cancelled',
                cancellationReason: body.reason,
                cancelledAt: new Date(),
                cancellationRequested: false,
              },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: 'cancelled',
                note: `Customer cancelled before production: ${body.reason}`,
              },
            });
          });
          return NextResponse.json({
            success: true,
            status: 'cancelled',
            message: 'Your order has been cancelled successfully.',
          });
        }

        // If in printing or QC, flag for admin review
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              cancellationRequested: true,
              cancellationRequestedAt: new Date(),
              cancellationReason: body.reason,
            },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              note: `Customer requested cancellation: ${body.reason}`,
            },
          });
        });

        return NextResponse.json({
          success: true,
          status: order.status,
          cancellationRequested: true,
          message: 'Cancellation request submitted for studio review.',
        });
      }

      case 'approve_design': {
        if (order.designStatus === 'approved') {
          return NextResponse.json({ message: 'Design already approved' });
        }

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              designStatus: 'approved',
              status: order.status === 'design_pending' ? 'design_approved' : order.status,
            },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: 'design_approved',
              note: 'Customer approved 3D design proof. Order queued for printing.',
            },
          });
        });

        return NextResponse.json({
          success: true,
          designStatus: 'approved',
          message: 'Design approved! Your custom piece is queued for 3D printing.',
        });
      }

      case 'request_design_changes': {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              designStatus: 'changes_requested',
              designFeedback: body.feedback,
            },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              note: `Customer requested design revision: ${body.feedback}`,
            },
          });
        });

        return NextResponse.json({
          success: true,
          designStatus: 'changes_requested',
          message: 'Revision notes received. Our studio will update the model.',
        });
      }
    }
  } catch (err: any) {
    console.error('Customer Order Action Error:', err);
    return NextResponse.json(
      { error: 'Failed to process order action.' },
      { status: 500 }
    );
  }
}
