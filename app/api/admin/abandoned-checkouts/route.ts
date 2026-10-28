import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guardAdmin, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const sp = req.nextUrl.searchParams;
    const filter = sp.get('status') || 'open'; // 'all', 'open', 'recovered'
    const query = sp.get('q')?.trim().toLowerCase() || '';

    const where: any = {};
    if (filter === 'open') {
      where.isRecovered = false;
    } else if (filter === 'recovered') {
      where.isRecovered = true;
    }

    if (query) {
      where.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { customerName: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ];
    }

    const checkouts = await prisma.abandonedCheckout.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://daxullabs.com';

    const formatted = checkouts.map((c) => ({
      id: c.id,
      cartId: c.cartId,
      customer: c.customerName || c.email || 'Anonymous Guest',
      email: c.email,
      phone: c.phone,
      itemCount: Array.isArray(c.items) ? c.items.length : 1,
      items: c.items,
      subtotal: c.subtotal,
      estimatedTotal: c.estimatedTotal,
      currentStep: c.currentStep,
      isRecovered: c.isRecovered,
      convertedOrderId: c.convertedOrderId,
      ageHours: Math.max(0, Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 3600000)),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      recoveryUrl: `${appUrl}/checkout?recover=${c.recoveryToken}`,
    }));

    return NextResponse.json({
      success: true,
      checkouts: formatted,
      count: formatted.length,
    });
  } catch (err) {
    return serverError(err, 'Admin GET Abandoned Checkouts Error:');
  }
}
