import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(200),
  phone: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().min(1, 'Message is required').max(5000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
        status: 'NEW',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out. Our studio team will get back to you shortly.',
      inquiryId: inquiry.id,
    });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    return NextResponse.json({ error: 'Unable to submit your message. Please try again later.' }, { status: 500 });
  }
}
