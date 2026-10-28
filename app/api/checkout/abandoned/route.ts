import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const sessionSchema = z.object({
  cartId: z.string().trim().min(1).max(128),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  customerName: z.string().trim().max(100).optional().nullable(),
  items: z.array(z.record(z.string(), z.unknown())).min(1),
  subtotal: z.number().min(0),
  estimatedTotal: z.number().min(0).optional(),
  currentStep: z.enum(['contact', 'shipping', 'payment']).default('contact'),
});

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = sessionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const {
      cartId,
      email,
      phone,
      customerName,
      items,
      subtotal,
      estimatedTotal,
      currentStep,
    } = parsed.data;

    const emailClean = email ? email.toLowerCase() : null;

    const record = await prisma.abandonedCheckout.upsert({
      where: { cartId },
      create: {
        cartId,
        email: emailClean,
        phone: phone || null,
        customerName: customerName || null,
        items: (items as any),
        subtotal,
        estimatedTotal: estimatedTotal || subtotal,
        currentStep,
      },
      update: {
        email: emailClean || undefined,
        phone: phone || undefined,
        customerName: customerName || undefined,
        items: (items as any),
        subtotal,
        estimatedTotal: estimatedTotal || subtotal,
        currentStep,
      },
    });

    return NextResponse.json({ success: true, recoveryToken: record.recoveryToken });
  } catch (err: any) {
    console.error('Abandoned checkout tracking error:', err);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
