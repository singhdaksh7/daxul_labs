import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { productInputSchema, productUpdateSchema, productActionSchema, slugify, type ProductInput } from './schema';

type Tx = Prisma.TransactionClient;
type Admin = { id: string | null; email: string };

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const fullInclude = {
  collection: { select: { id: true, name: true } },
  variantGroups: { include: { variants: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
  customFields: { orderBy: { order: 'asc' } },
} satisfies Prisma.ProductInclude;

function handleKnown(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = String((err.meta as any)?.target ?? '');
      const what = target.includes('sku') ? 'SKU' : target.includes('slug') ? 'Slug' : 'Value';
      return NextResponse.json({ error: `${what} already exists. Choose a different one.` }, { status: 409 });
    }
    if (err.code === 'P2025') return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return null;
}

async function uniqueSlug(tx: Tx, base: string, excludeId?: string) {
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const hit = await tx.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
  throw new HttpError('Could not generate a unique slug', 409);
}

async function resolveCategory(tx: Tx, collectionId: string | null, fallback: string) {
  if (!collectionId) return fallback;
  const c = await tx.collection.findUnique({ where: { id: collectionId }, select: { name: true } });
  if (!c) throw new HttpError('Selected collection does not exist', 400);
  return c.name;
}

function scalarData(d: ProductInput) {
  const pickNames = (re: RegExp) =>
    d.variantGroups.filter((g) => re.test(g.name)).flatMap((g) => g.variants.map((v) => v.name));
  return {
    name: d.name,
    subtitle: d.subtitle,
    description: d.description,
    story: d.story,
    collectionId: d.collectionId,
    price: d.price,
    compareAtPrice: d.compareAtPrice,
    sku: d.sku,
    customizable: d.customizable,
    prepaidOnly: d.prepaidOnly,
    codEnabled: d.codEnabled,
    isFeatured: d.isFeatured,
    isActive: d.isActive,
    isArchived: d.isArchived,
    trackInventory: d.trackInventory,
    lowStockThreshold: d.lowStockThreshold,
    badge: d.badge,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    ogImage: d.ogImage,
    images: d.images,
    videoUrl: d.videoUrl,
    materials: d.materials,
    dimensions: d.dimensions,
    careInstructions: d.careInstructions,
    leadTimeText: d.leadTimeText,
    productionTimeDays: d.productionTimeDays,
    estimatedDispatchDays: d.estimatedDispatchDays,
    specs: d.specs as Prisma.InputJsonValue,
    faq: d.faq as Prisma.InputJsonValue,
    businessCosts: d.businessCosts ? (d.businessCosts as Prisma.InputJsonValue) : Prisma.DbNull,
    // legacy arrays kept in sync for older storefront code
    colors: pickNames(/colou?r/i),
    sizes: pickNames(/size/i),
    finishes: pickNames(/finish|material/i),
  };
}

function customFieldData(f: ProductInput['customFields'][number], order: number) {
  const isChoice = f.type === 'select' || f.type === 'radio';
  const choices = isChoice ? f.choices.map((c) => ({ label: c.label, value: c.value || c.label, priceAdjustment: c.priceAdjustment })) : [];
  return {
    label: f.label,
    type: f.type,
    required: f.required,
    fee: f.fee,
    placeholder: f.placeholder,
    helpText: f.helpText,
    order,
    isActive: f.isActive,
    choices: choices as Prisma.InputJsonValue,
    options: choices.map((c) => c.label),
  };
}

async function writeAdjustment(
  tx: Tx,
  admin: Admin,
  args: { productId: string; variantId?: string | null; delta: number; quantityAfter: number; reason: string; note: string },
) {
  await tx.inventoryAdjustment.create({
    data: {
      productId: args.productId,
      variantId: args.variantId ?? null,
      delta: args.delta,
      quantityAfter: args.quantityAfter,
      reason: args.reason,
      note: args.note,
      adminUserId: admin.id,
      adminEmail: admin.email,
    },
  });
}

/** Replace variant groups / variants: update by id, create new, delete missing. Stock changes are ledgered. */
async function syncVariants(tx: Tx, admin: Admin, productId: string, groups: ProductInput['variantGroups']) {
  const existing = await tx.productVariantGroup.findMany({ where: { productId }, include: { variants: true } });
  const keepGroupIds = new Set(groups.map((g) => g.id).filter(Boolean) as string[]);
  const dropGroups = existing.filter((g) => !keepGroupIds.has(g.id)).map((g) => g.id);
  if (dropGroups.length) await tx.productVariantGroup.deleteMany({ where: { id: { in: dropGroups } } });

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const prev = g.id ? existing.find((e) => e.id === g.id) : undefined;
    let groupId: string;
    if (prev) {
      await tx.productVariantGroup.update({ where: { id: prev.id }, data: { name: g.name, sortOrder: gi } });
      groupId = prev.id;
    } else {
      groupId = (await tx.productVariantGroup.create({ data: { productId, name: g.name, sortOrder: gi } })).id;
    }
    const prevVariants = prev?.variants ?? [];
    const keepV = new Set(g.variants.map((v) => v.id).filter(Boolean) as string[]);
    const dropV = prevVariants.filter((v) => !keepV.has(v.id)).map((v) => v.id);
    if (dropV.length) await tx.productVariant.deleteMany({ where: { id: { in: dropV } } });

    for (let vi = 0; vi < g.variants.length; vi++) {
      const v = g.variants[vi];
      const pv = v.id ? prevVariants.find((e) => e.id === v.id) : undefined;
      const data = { name: v.name, sku: v.sku, priceAdjustment: v.priceAdjustment, stock: v.stock, isActive: v.isActive, sortOrder: vi };
      if (pv) {
        await tx.productVariant.update({ where: { id: pv.id }, data });
        if (v.stock !== null && v.stock !== pv.stock) {
          const before = pv.stock ?? 0;
          await writeAdjustment(tx, admin, {
            productId,
            variantId: pv.id,
            delta: v.stock - before,
            quantityAfter: v.stock,
            reason: 'correction',
            note: 'Edited in product editor',
          });
        }
      } else {
        const created = await tx.productVariant.create({ data: { ...data, groupId } });
        if (v.stock !== null && v.stock > 0) {
          await writeAdjustment(tx, admin, {
            productId,
            variantId: created.id,
            delta: v.stock,
            quantityAfter: v.stock,
            reason: 'manual',
            note: 'Initial variant stock',
          });
        }
      }
    }
  }
}

async function syncCustomFields(tx: Tx, productId: string, fields: ProductInput['customFields']) {
  const existing = await tx.customField.findMany({ where: { productId }, select: { id: true } });
  const keep = new Set(fields.map((f) => f.id).filter(Boolean) as string[]);
  const drop = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (drop.length) await tx.customField.deleteMany({ where: { id: { in: drop } } });
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const data = customFieldData(f, i);
    if (f.id && existing.some((e) => e.id === f.id)) await tx.customField.update({ where: { id: f.id }, data });
    else await tx.customField.create({ data: { ...data, productId } });
  }
}

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const sp = new URL(req.url).searchParams;
    const id = sp.get('id');
    if (id) {
      const product = await prisma.product.findUnique({ where: { id }, include: fullInclude });
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ success: true, product });
    }

    const q = (sp.get('q') || '').trim();
    const status = sp.get('status') || 'active'; // active | archived | low | all
    const collectionId = sp.get('collectionId');

    const where: Prisma.ProductWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (collectionId) where.collectionId = collectionId;
    if (status === 'archived') where.isArchived = true;
    else if (status !== 'all') where.isArchived = false;

    let products = await prisma.product.findMany({
      where,
      include: {
        collection: { select: { id: true, name: true } },
        variantGroups: { select: { id: true, variants: { select: { id: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (status === 'low') products = products.filter((p) => p.trackInventory && p.stock <= p.lowStockThreshold);

    return NextResponse.json({
      success: true,
      products: products.map(({ variantGroups, businessCosts: _costs, ...p }) => ({
        ...p,
        variantCount: variantGroups.reduce((n, gr) => n + gr.variants.length, 0),
      })),
    });
  } catch (err) {
    return serverError(err, 'Admin GET products');
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, productInputSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const product = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(tx, slugify(d.slug || d.name));
      const category = await resolveCategory(tx, d.collectionId, 'General');
      const created = await tx.product.create({
        data: { ...scalarData(d), slug, category, stock: d.stock },
      });
      if (d.stock > 0) {
        await writeAdjustment(tx, g.admin, {
          productId: created.id,
          delta: d.stock,
          quantityAfter: d.stock,
          reason: 'manual',
          note: 'Initial stock',
        });
      }
      await syncVariants(tx, g.admin, created.id, d.variantGroups);
      await syncCustomFields(tx, created.id, d.customFields);
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: fullInclude });
    });
    await logAdminAction(g.admin, 'product.create', 'Product', product.id, {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
    });
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err) {
    return handleKnown(err) ?? serverError(err, 'Admin POST product');
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, productUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const { id, ...d } = parsed.data;
  try {
    const { product, before } = await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id } });
      if (!before) throw new HttpError('Product not found', 404);
      const slug = await uniqueSlug(tx, slugify(d.slug || d.name), id);
      const category =
        d.collectionId === before.collectionId ? before.category : await resolveCategory(tx, d.collectionId, before.category);
      await tx.product.update({ where: { id }, data: { ...scalarData(d), slug, category, stock: d.stock } });
      if (d.stock !== before.stock) {
        await writeAdjustment(tx, g.admin, {
          productId: id,
          delta: d.stock - before.stock,
          quantityAfter: d.stock,
          reason: 'correction',
          note: 'Edited in product editor',
        });
      }
      await syncVariants(tx, g.admin, id, d.variantGroups);
      await syncCustomFields(tx, id, d.customFields);
      const product = await tx.product.findUniqueOrThrow({ where: { id }, include: fullInclude });
      return { product, before };
    });

    await logAdminAction(g.admin, 'product.update', 'Product', id, { name: product.name, slug: product.slug });
    if (before.price !== product.price) {
      await logAdminAction(g.admin, 'product.price_change', 'Product', id, {
        name: product.name,
        oldPrice: before.price,
        newPrice: product.price,
        change: `${before.price} -> ${product.price}`,
      });
    }
    if (before.isArchived !== product.isArchived) {
      await logAdminAction(g.admin, product.isArchived ? 'product.archive' : 'product.unarchive', 'Product', id, {
        name: product.name,
      });
    }
    return NextResponse.json({ success: true, product });
  } catch (err) {
    return handleKnown(err) ?? serverError(err, 'Admin PUT product');
  }
}

/** Quick actions: duplicate | archive | unarchive | feature | unfeature */
export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, productActionSchema);
  if (!parsed.ok) return parsed.response;
  const { id, action } = parsed.data;
  try {
    if (action === 'duplicate') {
      const copy = await prisma.$transaction(async (tx) => {
        const src = await tx.product.findUnique({ where: { id }, include: fullInclude });
        if (!src) throw new HttpError('Product not found', 404);
        const slug = await uniqueSlug(tx, `${src.slug}-copy`);
        let sku: string | null = null;
        if (src.sku) {
          sku = `${src.sku}-COPY`;
          for (let i = 2; await tx.product.findUnique({ where: { sku }, select: { id: true } }); i++) sku = `${src.sku}-COPY${i}`;
        }
        const created = await tx.product.create({
          data: {
            name: `${src.name} (Copy)`,
            slug,
            sku,
            category: src.category,
            price: src.price,
            compareAtPrice: src.compareAtPrice,
            description: src.description,
            story: src.story,
            specs: src.specs ?? undefined,
            faq: src.faq ?? undefined,
            careInstructions: src.careInstructions,
            images: src.images,
            videoUrl: src.videoUrl,
            badge: src.badge,
            stock: 0,
            productionTimeDays: src.productionTimeDays,
            estimatedDispatchDays: src.estimatedDispatchDays,
            prepaidOnly: src.prepaidOnly,
            codEnabled: src.codEnabled,
            finishes: src.finishes,
            colors: src.colors,
            sizes: src.sizes,
            businessCosts: src.businessCosts ?? undefined,
            isArchived: true,
            isFeatured: false,
            isActive: false,
            subtitle: src.subtitle,
            customizable: src.customizable,
            trackInventory: src.trackInventory,
            lowStockThreshold: src.lowStockThreshold,
            seoTitle: src.seoTitle,
            seoDescription: src.seoDescription,
            ogImage: src.ogImage,
            materials: src.materials,
            dimensions: src.dimensions,
            leadTimeText: src.leadTimeText,
            collectionId: src.collectionId,
          },
        });
        for (const grp of src.variantGroups) {
          await tx.productVariantGroup.create({
            data: {
              productId: created.id,
              name: grp.name,
              sortOrder: grp.sortOrder,
              variants: {
                create: grp.variants.map((v) => ({
                  name: v.name,
                  sku: v.sku ? `${v.sku}-COPY` : null,
                  priceAdjustment: v.priceAdjustment,
                  stock: v.stock === null ? null : 0,
                  isActive: v.isActive,
                  sortOrder: v.sortOrder,
                })),
              },
            },
          });
        }
        for (const f of src.customFields) {
          await tx.customField.create({
            data: {
              productId: created.id,
              label: f.label,
              type: f.type,
              required: f.required,
              options: f.options,
              fee: f.fee,
              placeholder: f.placeholder,
              helpText: f.helpText,
              order: f.order,
              isActive: f.isActive,
              choices: f.choices ?? undefined,
            },
          });
        }
        return created;
      });
      await logAdminAction(g.admin, 'product.duplicate', 'Product', copy.id, { sourceId: id, slug: copy.slug });
      return NextResponse.json({ success: true, product: copy }, { status: 201 });
    }

    const data =
      action === 'archive'
        ? { isArchived: true }
        : action === 'unarchive'
          ? { isArchived: false }
          : { isFeatured: action === 'feature' };
    const product = await prisma.product.update({ where: { id }, data, select: { id: true, name: true, isArchived: true, isFeatured: true } });
    await logAdminAction(g.admin, `product.${action}`, 'Product', id, { name: product.name });
    return NextResponse.json({ success: true, product });
  } catch (err) {
    return handleKnown(err) ?? serverError(err, 'Admin PATCH product');
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, slug: true } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const orderRefs = await prisma.orderItem.count({ where: { productId: id } });
    if (orderRefs > 0) {
      return NextResponse.json(
        { error: 'This product appears in existing orders and cannot be deleted. Archive it instead.' },
        { status: 409 },
      );
    }
    try {
      await prisma.product.delete({ where: { id } });
    } catch (e) {
      // FK race: an order item was created concurrently
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        return NextResponse.json({ error: 'Product is referenced by orders. Archive it instead.' }, { status: 409 });
      }
      throw e;
    }
    await logAdminAction(g.admin, 'product.delete', 'Product', id, { name: product.name, sku: product.sku, slug: product.slug });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleKnown(err) ?? serverError(err, 'Admin DELETE product');
  }
}
