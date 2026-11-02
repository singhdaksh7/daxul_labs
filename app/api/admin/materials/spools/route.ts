import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createFilamentSpool, consumeFilament } from '@/lib/operations/materials';
import { z } from 'zod';

const createSpoolSchema = z.object({
  materialItemId: z.string().min(1),
  brand: z.string().optional(),
  materialType: z.string().optional(),
  colorName: z.string().min(1),
  colorHex: z.string().optional(),
  diameter: z.number().optional(),
  initialWeightGrams: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  lotNumber: z.string().optional(),
  supplierId: z.string().optional().nullable(),
  printerId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = createSpoolSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const spool = await createFilamentSpool(parsed.data);
    return NextResponse.json({ success: true, spool });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create spool' }, { status: 400 });
  }
}

