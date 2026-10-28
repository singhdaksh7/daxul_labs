import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const sessionSchema = z.object({
  cartId: z.string().trim().min(1).max(128).optional(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  customerName: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().max(100).optional().nullable(),
  items: z.array(z.record(z.string(), z.unknown())).min(1),
  subtotal: z.number().min(0).optional(),
  cartSubtotal: z.number().min(0).optional(),
  estimatedTotal: z.number().min(0).optional(),
  currentStep: z.string().optional(),
  checkoutStep: z.string().optional(),
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
      name,
      items,
      subtotal,
      cartSubtotal,
      estimatedTotal,
      currentStep,
      checkoutStep,
    } = parsed.data;

    const emailClean = email ? email.toLowerCase() : null;
    const finalCartId = cartId || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const finalName = customerName || name || null;
    const finalSubtotal = subtotal ?? cartSubtotal ?? 0;
    const finalTotal = estimatedTotal || finalSubtotal;
    const rawStep = currentStep || checkoutStep || 'contact';
    const finalStep = ['contact', 'shipping', 'payment'].includes(rawStep) ? rawStep : 'contact';

    const record = await prisma.abandonedCheckout.upsert({
      where: { cartId: finalCartId },
      create: {
        cartId: finalCartId,
        email: emailClean,
        phone: phone || null,
        customerName: finalName,
        items: (items as any),
        subtotal: finalSubtotal,
        estimatedTotal: finalTotal,
        currentStep: finalStep,
      },
      update: {
        email: emailClean || undefined,
        phone: phone || undefined,
        customerName: finalName || undefined,
        items: (items as any),
        subtotal: finalSubtotal,
        estimatedTotal: finalTotal,
        currentStep: finalStep,
      },
    });

    return NextResponse.json({ success: true, recoveryToken: record.recoveryToken });
  } catch (err: any) {
    console.error('Abandoned checkout tracking error:', err);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
