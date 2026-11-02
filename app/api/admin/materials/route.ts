import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createMaterialItem, adjustMaterialStock, createFilamentSpool, consumeFilament } from '@/lib/operations/materials';
import { getOperationsSettings } from '@/lib/operations/settings';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  const [settings, materials, spools, lowStockCount] = await Promise.all([
    getOperationsSettings(),
    prisma.materialItem.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      include: {
        preferredSupplier: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.filamentSpool.findMany({
      include: {
        printer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.materialItem.count({
      where: { currentQuantity: { lte: 10 } },
    }),
  ]);

  return NextResponse.json({
    enabled: settings.rawMaterialsEnabled,
    metrics: {
      totalMaterials: materials.length,
      totalSpools: spools.length,
      lowStockCount,
    },
    materials,
    spools,
  });
}

const createMaterialSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.enum(['FILAMENT', 'ELECTRONICS', 'LED', 'MAGNET', 'FASTENER', 'ADHESIVE', 'PACKAGING', 'PRINTED_INSERT', 'OTHER']),
  unit: z.enum(['GRAM', 'KG', 'METER', 'PIECE', 'ROLL', 'PACK', 'BOX']),
  unitCost: z.number().min(0),
  reorderPoint: z.number().min(0).optional(),
  currentQuantity: z.number().min(0).optional(),
  preferredSupplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = createMaterialSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const item = await createMaterialItem(parsed.data as any);
    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create material' }, { status: 400 });
  }
}

