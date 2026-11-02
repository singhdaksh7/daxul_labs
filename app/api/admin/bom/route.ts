import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createOrUpdateBom, checkMaterialAvailability } from '@/lib/operations/bom';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  const boms = await prisma.billOfMaterials.findMany({
    where: productId ? { productId } : {},
    include: {
      product: { select: { id: true, name: true, sku: true } },
      variant: { select: { id: true, name: true, sku: true } },
      versions: {
        where: { isCurrent: true },
        include: {
          items: {
            include: { materialItem: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ boms });
}

const bomItemSchema = z.object({
  materialItemId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['GRAM', 'KG', 'METER', 'PIECE', 'ROLL', 'PACK', 'BOX']),
  wasteAllowancePercent: z.number().min(0).optional(),
  isOptional: z.boolean().optional(),
  notes: z.string().optional(),
});

const bomSchema = z.object({
  name: z.string().min(2),
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  items: z.array(bomItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = bomSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const result = await createOrUpdateBom(parsed.data as any);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create BOM' }, { status: 400 });
  }
}

