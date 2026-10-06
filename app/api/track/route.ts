import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Simple rate limiter for order tracking: max 10 attempts per minute per IP
const trackAttempts = new Map<string, { count: number; resetTime: number }>();
const LIMIT_PER_MINUTE = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = trackAttempts.get(ip);

  if (!record || now > record.resetTime) {
    trackAttempts.set(ip, { count: 1, resetTime: now + 60000 });
    return false;
  }

  if (record.count >= LIMIT_PER_MINUTE) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many order tracking attempts. Please wait 1 minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { orderNumber, verificationInput } = body;

    if (!orderNumber || !verificationInput) {
      return NextResponse.json(
        { error: 'Both Order Number and matching Email or Phone are required to track an order.' },
        { status: 400 }
      );
    }

    const cleanOrderNum = orderNumber.trim().toUpperCase();
    const cleanVerification = verificationInput.trim().toLowerCase();

    // Query database requiring BOTH orderNumber AND email/phone match
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: cleanOrderNum,
        OR: [
          { customerEmail: cleanVerification },
          { customerPhone: cleanVerification },
        ],
      },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            selectedFinish: true,
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
    });

    if (!order) {
      return NextResponse.json(
        { error: 'No order found matching the provided Order Number and Email/Phone combination.' },
        { status: 404 }
      );
    }

    // Mask name for privacy (e.g. "Rahul S***")
    const nameParts = order.customerName.split(' ');
    const maskedName = nameParts.map((p, i) => i === 0 ? p : p[0] + '***').join(' ');

    // Return minimal customer-safe payload
    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        customerName: maskedName,
        status: order.status,
        trackingNumber: order.trackingNumber,
        courierName: order.courierName,
        qcNotes: order.qcNotes,
        items: order.items,
        statusHistory: order.statusHistory,
        createdAt: order.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Order tracking API error:', err);
    return NextResponse.json({ error: 'Failed to process tracking request' }, { status: 500 });
  }
}
