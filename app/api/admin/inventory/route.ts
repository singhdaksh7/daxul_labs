import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

const adjustSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullish(),
  delta: z.number().int().refine((n) => n !== 0, 'Delta must not be zero').refine((n) => Math.abs(n) <= 1_000_000, 'Delta too large'),
  reason: z.enum(['production_added', 'damaged', 'correction', 'returned', 'manual']),
  note: z.string().trim().max(500).nullish(),
});

class NegativeStock extends Error {}

function status(stock: number, threshold: number) {
  return stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'ok';
}

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const sp = new URL(req.url).searchParams;
    const historyFor = sp.get('productId');
    if (historyFor) {
      const history = await prisma.inventoryAdjustment.findMany({
        where: { productId: historyFor },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { variant: { select: { name: true, sku: true } } },
      });
      return NextResponse.json({ success: true, history });
    }

    const q = (sp.get('q') || '').trim().toLowerCase();
    const filter = sp.get('status') || 'all'; // all | ok | low | out
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
      include: { variantGroups: { orderBy: { sortOrder: 'asc' }, include: { variants: { orderBy: { sortOrder: 'asc' } } } } },
    });

    type Row = {
      key: string;
      productId: string;
      variantId: string | null;
      sku: string | null;
      productName: string;
      variantName: string | null;
      stock: number;
      lowStockThreshold: number;
      status: 'ok' | 'low' | 'out';
      tracked: boolean;
    };
    const rows: Row[] = [];
    for (const p of products) {
      rows.push({
        key: p.id,
        productId: p.id,
        variantId: null,
        sku: p.sku,
        productName: p.name,
        variantName: null,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        status: status(p.stock, p.lowStockThreshold),
        tracked: p.trackInventory,
      });
      for (const grp of p.variantGroups) {
        for (const v of grp.variants) {
          if (v.stock === null) continue;
          rows.push({
            key: v.id,
            productId: p.id,
            variantId: v.id,
            sku: v.sku,
            productName: p.name,
            variantName: `${grp.name}: ${v.name}`,
            stock: v.stock,
            lowStockThreshold: p.lowStockThreshold,
            status: status(v.stock, p.lowStockThreshold),
            tracked: true,
          });
        }
      }
    }
    const out = rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (q && !`${r.productName} ${r.variantName ?? ''} ${r.sku ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return NextResponse.json({ success: true, rows: out });
  } catch (err) {
    return serverError(err, 'Admin GET inventory');
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const parsed = await parseBody(req, adjustSchema);
  if (!parsed.ok) return parsed.response;
  const { productId, variantId, delta, reason, note } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      let after: number;
      if (variantId) {
        const v = await tx.productVariant.findFirst({ where: { id: variantId, group: { productId } } });
        if (!v) return { notFound: true as const };
        if (v.stock === null) return { untracked: true as const };
        after = (await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: delta } } })).stock ?? 0;
      } else {
        const p = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!p) return { notFound: true as const };
        after = (await tx.product.update({ where: { id: productId }, data: { stock: { increment: delta } } })).stock;
      }
      if (after < 0) throw new NegativeStock();
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          productId,
          variantId: variantId ?? null,
          delta,
          quantityAfter: after,
          reason,
          note: note || null,
          adminUserId: g.admin.id,
          adminEmail: g.admin.email,
        },
      });
      return { adjustment, after };
    });

    if ('notFound' in result) return NextResponse.json({ error: 'Product or variant not found' }, { status: 404 });
    if ('untracked' in result) {
      return NextResponse.json({ error: 'This variant has no separate stock. Set a stock value in the product editor first.' }, { status: 400 });
    }
    await logAdminAction(g.admin, 'inventory.adjust', 'Product', productId, {
      variantId: variantId ?? null,
      delta,
      quantityAfter: result.after,
      reason,
    });
    return NextResponse.json({ success: true, adjustment: result.adjustment, stock: result.after });
  } catch (err) {
    if (err instanceof NegativeStock) {
      return NextResponse.json({ error: 'Adjustment would make stock negative' }, { status: 400 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Product or variant not found' }, { status: 404 });
    }
    return serverError(err, 'Admin POST inventory');
  }
}
