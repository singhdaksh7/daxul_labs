import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const addressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(25),
  street: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().min(5).max(10),
  country: z.string().trim().default('India'),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ success: true, addresses });
  } catch (err) {
    console.error('Fetch Addresses Error:', err);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const userId = sessionUser.id;

  try {
    const json = await req.json();
    const parsed = addressSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid address' }, { status: 400 });
    }

    const d = parsed.data;

    const address = await prisma.$transaction(async (tx) => {
      if (d.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      // If this is the user's first address, make it default automatically
      const count = await tx.address.count({ where: { userId } });
      const makeDefault = d.isDefault || count === 0;

      return tx.address.create({
        data: {
          userId,
          name: d.name,
          phone: d.phone,
          street: d.street,
          city: d.city,
          state: d.state,
          pincode: d.pincode,
          country: d.country,
          isDefault: makeDefault,
        },
      });
    });

    return NextResponse.json({ success: true, address });
  } catch (err: any) {
    console.error('Add Address Error:', err);
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
  }
}

const editAddressSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(5).max(25).optional(),
  street: z.string().trim().min(1).max(255).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  pincode: z.string().trim().min(5).max(10).optional(),
  country: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = editAddressSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { id, isDefault, ...rest } = parsed.data;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: sessionUser.id },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...rest,
          ...(isDefault !== undefined ? { isDefault } : {}),
        },
      });
    });

    return NextResponse.json({ success: true, address: updated });
  } catch (err: any) {
    console.error('Update Address Error:', err);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Address id required' }, { status: 400 });

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      // If deleted address was default, promote another address to default
      if (existing.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: sessionUser.id } });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Address Error:', err);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
