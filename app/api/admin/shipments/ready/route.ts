import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Orders that are not yet dispatched and can be shipped (no shipment record, not cancelled/shipped/delivered). */
export async function GET() {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { notIn: ['cancelled', 'shipped', 'delivered'] },
        shipments: { none: {} },
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        street: true,
        city: true,
        state: true,
        pincode: true,
        totalAmount: true,
        paymentMethod: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('Admin GET shipments/ready error:', err);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}
