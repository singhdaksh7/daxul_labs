import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;

  if (!session || !sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        notificationPreferences: true,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
        wishlist: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                compareAtPrice: true,
                images: true,
                stock: true,
                customizable: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    console.error('Customer profile fetch error:', err);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

const updateProfileSchema = z.object({
  name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(25).optional(),
  notificationPreferences: z
    .object({
      email: z.boolean().default(true),
      whatsapp: z.boolean().default(true),
      sms: z.boolean().default(false),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!session || !sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.notificationPreferences !== undefined) {
      data.notificationPreferences = parsed.data.notificationPreferences;
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notificationPreferences: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    console.error('Customer profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
