import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/loginLimiter';

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(100),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  orderNumber: z.string().trim().max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid registration details' },
        { status: 400 }
      );
    }

    const { email, password, name, phone, orderNumber } = parsed.data;
    const emailKey = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account already exists with this email address. Please sign in.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailKey,
          passwordHash,
          name: name || null,
          phone: phone || null,
          role: 'CUSTOMER',
        },
      });

      // Automatically link any past guest orders matching this email
      await tx.order.updateMany({
        where: { customerEmail: emailKey, userId: null },
        data: { userId: user.id },
      });

      // If registered right after an order, extract the address and save as default address
      if (orderNumber) {
        const order = await tx.order.findUnique({
          where: { orderNumber },
        });
        if (order && order.customerEmail.toLowerCase() === emailKey) {
          await tx.address.create({
            data: {
              userId: user.id,
              name: order.customerName,
              phone: order.customerPhone,
              street: order.street,
              city: order.city,
              state: order.state,
              pincode: order.pincode,
              country: order.country,
              isDefault: true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          adminUserEmail: emailKey,
          action: 'CUSTOMER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          details: { orderLinked: orderNumber || null },
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now sign in.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (err: any) {
    console.error('Customer Registration Error:', err);
    return NextResponse.json(
      { error: 'Failed to create customer account. Please try again.' },
      { status: 500 }
    );
  }
}
