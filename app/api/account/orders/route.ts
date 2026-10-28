import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;

  if (!session || !sessionUser?.id || !sessionUser?.email) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: sessionUser.id },
          { customerEmail: sessionUser.email.toLowerCase() },
        ],
      },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productImage: true,
            unitPrice: true,
            quantity: true,
            selectedFinish: true,
            selectedColor: true,
            selectedSize: true,
            customizations: true,
            variantSelections: true,
          },
        },
        statusHistory: {
          select: {
            status: true,
            timestamp: true,
            note: true,
          },
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Strip any sensitive admin notes before returning
    const safeOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      totalAmount: o.totalAmount,
      discountAmount: o.discountAmount,
      shippingFee: o.shippingFee,
      codFee: o.codFee,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status,
      courierName: o.courierName,
      trackingNumber: o.trackingNumber,
      trackingUrl: o.trackingUrl,
      proofImageUrl: o.proofImageUrl,
      designStatus: o.designStatus,
      designNotes: o.designNotes,
      designFeedback: o.designFeedback,
      cancellationRequested: o.cancellationRequested,
      refundStatus: o.refundStatus,
      refundedAmount: o.refundedAmount,
      shippingAddress: {
        street: o.street,
        city: o.city,
        state: o.state,
        pincode: o.pincode,
        country: o.country,
      },
      items: o.items,
      statusHistory: o.statusHistory.map((h) => ({
        status: h.status,
        timestamp: h.timestamp,
        note: h.note?.startsWith('[') ? null : h.note, // omit raw admin tags
      })),
    }));

    return NextResponse.json({ success: true, orders: safeOrders });
  } catch (err: any) {
    console.error('Customer Orders Fetch Error:', err);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}
