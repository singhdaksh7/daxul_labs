import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

const dateField = z
  .string()
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Invalid date')
  .nullable()
  .optional();

const couponFields = z.object({
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_-]{3,32}$/, 'Code must be 3-32 chars: A-Z, 0-9, _ or -')),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive().max(1_000_000),
  minOrderValue: z.number().min(0).max(10_000_000).default(0),
  startDate: dateField,
  expiryDate: dateField,
  usageLimit: z.number().int().positive().max(1_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
});

function refine<T extends z.ZodType<{ discountType: string; discountValue: number; startDate?: string | null; expiryDate?: string | null }>>(s: T) {
  return s
    .refine((v) => v.discountType !== 'percentage' || v.discountValue <= 100, {
      message: 'Percentage discount cannot exceed 100',
      path: ['discountValue'],
    })
    .refine(
      (v) => !v.startDate || !v.expiryDate || Date.parse(v.expiryDate) >= Date.parse(v.startDate),
      { message: 'Expiry must be after start date', path: ['expiryDate'] },
    );
}

const createSchema = refine(couponFields);
const updateSchema = refine(couponFields.extend({ id: z.string().min(1).max(64) }));

const toDate = (v?: string | null) => (v ? new Date(v) : null);

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    return NextResponse.json({ success: true, coupons });
  } catch (err) {
    return serverError(err, 'Admin GET Coupons Error:');
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: d.code,
        discountType: d.discountType,
        discountValue: d.discountValue,
        minOrderValue: d.minOrderValue,
        startDate: toDate(d.startDate),
        expiryDate: toDate(d.expiryDate),
        usageLimit: d.usageLimit ?? null,
        isActive: d.isActive,
      },
    });
    await logAdminAction(g.admin, 'COUPON_CREATE', 'Coupon', coupon.id, { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue });
    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 });
    }
    return serverError(err, 'Admin POST Coupon Error:');
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const { id, ...d } = parsed.data;
  try {
    const before = await prisma.coupon.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    // usedCount is read-only and never written here.
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: d.code,
        discountType: d.discountType,
        discountValue: d.discountValue,
        minOrderValue: d.minOrderValue,
        startDate: toDate(d.startDate),
        expiryDate: toDate(d.expiryDate),
        usageLimit: d.usageLimit ?? null,
        isActive: d.isActive,
      },
    });
    await logAdminAction(g.admin, 'COUPON_UPDATE', 'Coupon', id, {
      code: coupon.code,
      before: { code: before.code, discountType: before.discountType, discountValue: before.discountValue, minOrderValue: before.minOrderValue, usageLimit: before.usageLimit, isActive: before.isActive },
      after: { discountType: coupon.discountType, discountValue: coupon.discountValue, minOrderValue: coupon.minOrderValue, usageLimit: coupon.usageLimit, isActive: coupon.isActive },
    });
    return NextResponse.json({ success: true, coupon });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 });
    }
    return serverError(err, 'Admin PUT Coupon Error:');
  }
}

const deleteSchema = z.object({ id: z.string().min(1).max(64) });

/** Deletes an unused coupon; a coupon that has been redeemed is disabled instead (history preserved). */
export async function DELETE(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, deleteSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const c = await prisma.coupon.findUnique({ where: { id: parsed.data.id } });
    if (!c) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    if (c.usedCount > 0) {
      await prisma.coupon.update({ where: { id: c.id }, data: { isActive: false } });
      await logAdminAction(g.admin, 'COUPON_DISABLE', 'Coupon', c.id, { code: c.code, usedCount: c.usedCount });
      return NextResponse.json({ success: true, result: 'disabled' });
    }
    await prisma.coupon.delete({ where: { id: c.id } });
    await logAdminAction(g.admin, 'COUPON_DELETE', 'Coupon', c.id, { code: c.code });
    return NextResponse.json({ success: true, result: 'deleted' });
  } catch (err) {
    return serverError(err, 'Admin DELETE Coupon Error:');
  }
}
