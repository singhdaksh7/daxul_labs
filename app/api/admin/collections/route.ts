import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

const optStr = (max = 5000) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));

const baseFields = {
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional().default(''),
  description: z.string().max(10000).default(''),
  image: z.string().trim().max(2000).default(''),
  heroMedia: optStr(2000),
  badge: optStr(60),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seoTitle: optStr(200),
  seoDescription: optStr(1000),
  ogImage: optStr(2000),
};

const createSchema = z.object({ ...baseFields, productIds: z.array(z.string()).max(1000).optional() });
const updateSchema = z.object({ ...baseFields, id: z.string().min(1), productIds: z.array(z.string()).max(1000).optional() });
const actionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['archive', 'unarchive', 'move_up', 'move_down']),
});

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'collection'
  );
}

async function uniqueSlug(tx: Prisma.TransactionClient, base: string, excludeId?: string) {
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const hit = await tx.collection.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
  throw new Error('slug generation failed');
}

function known(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    if (err.code === 'P2025') return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const collection = await prisma.collection.findUnique({
        where: { id },
        include: { products: { select: { id: true, name: true, sku: true, images: true, isArchived: true }, orderBy: { name: 'asc' } } },
      });
      if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      return NextResponse.json({ success: true, collection });
    }
    const collections = await prisma.collection.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ success: true, collections });
  } catch (err) {
    return serverError(err, 'Admin GET collections');
  }
}

async function assign(tx: Prisma.TransactionClient, collectionId: string, productIds: string[]) {
  await tx.product.updateMany({ where: { collectionId, id: { notIn: productIds } }, data: { collectionId: null } });
  if (productIds.length) await tx.product.updateMany({ where: { id: { in: productIds } }, data: { collectionId } });
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const { productIds, slug: rawSlug, ...d } = parsed.data;
  try {
    const collection = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(tx, slugify(rawSlug || d.name));
      const max = await tx.collection.aggregate({ _max: { order: true } });
      const created = await tx.collection.create({ data: { ...d, slug, order: (max._max.order ?? -1) + 1 } });
      if (productIds) await assign(tx, created.id, productIds);
      return created;
    });
    await logAdminAction(g.admin, 'collection.create', 'Collection', collection.id, { name: collection.name, slug: collection.slug });
    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (err) {
    return known(err) ?? serverError(err, 'Admin POST collection');
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const { id, productIds, slug: rawSlug, ...d } = parsed.data;
  try {
    const collection = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(tx, slugify(rawSlug || d.name), id);
      const updated = await tx.collection.update({ where: { id }, data: { ...d, slug } });
      if (productIds) await assign(tx, id, productIds);
      return updated;
    });
    await logAdminAction(g.admin, 'collection.update', 'Collection', id, {
      name: collection.name,
      assignedProducts: productIds ? productIds.length : undefined,
    });
    return NextResponse.json({ success: true, collection });
  } catch (err) {
    return known(err) ?? serverError(err, 'Admin PUT collection');
  }
}

export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, actionSchema);
  if (!parsed.ok) return parsed.response;
  const { id, action } = parsed.data;
  try {
    if (action === 'archive' || action === 'unarchive') {
      const c = await prisma.collection.update({ where: { id }, data: { isActive: action === 'unarchive' } });
      await logAdminAction(g.admin, `collection.${action}`, 'Collection', id, { name: c.name });
      return NextResponse.json({ success: true, collection: c });
    }
    await prisma.$transaction(async (tx) => {
      const all = await tx.collection.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], select: { id: true } });
      const idx = all.findIndex((c) => c.id === id);
      if (idx < 0) throw new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: '' });
      const swap = action === 'move_up' ? idx - 1 : idx + 1;
      if (swap >= 0 && swap < all.length) [all[idx], all[swap]] = [all[swap], all[idx]];
      for (let i = 0; i < all.length; i++) await tx.collection.update({ where: { id: all[i].id }, data: { order: i } });
    });
    await logAdminAction(g.admin, 'collection.reorder', 'Collection', id, { direction: action });
    return NextResponse.json({ success: true });
  } catch (err) {
    return known(err) ?? serverError(err, 'Admin PATCH collection');
  }
}
