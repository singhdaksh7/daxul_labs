import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { authorized, reason } = await requireAdminSession();
    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: {
        items: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    console.error('Admin GET Orders Error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { authorized, reason, session } = await requireAdminSession();
    if (!authorized || !session) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, status, note, trackingNumber, courierName, qcNotes, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          ...(status && { status }),
          ...(trackingNumber !== undefined && { trackingNumber }),
          ...(courierName !== undefined && { courierName }),
          ...(qcNotes !== undefined && { qcNotes }),
          ...(paymentStatus !== undefined && { paymentStatus }),
        },
      });

      // Record status history if status changed
      if (status && status !== existingOrder.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status,
            note: note || `Status changed to ${status}`,
          },
        });
      }

      // Record Audit Log (Requirement 20)
      await tx.auditLog.create({
        data: {
          adminUserId: (session?.user as any)?.id || null,
          adminUserEmail: session?.user?.email || 'admin@daxullabs.com',
          action: 'UPDATE_ORDER_STATUS',
          entityType: 'ORDER',
          entityId: orderId,
          details: {
            previousStatus: existingOrder.status,
            newStatus: status || existingOrder.status,
            paymentStatus: paymentStatus || existingOrder.paymentStatus,
            trackingNumber: trackingNumber || existingOrder.trackingNumber,
            note,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('Admin PATCH Order Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  }
}
