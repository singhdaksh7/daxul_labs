import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin } from '@/lib/adminApi';
import { createSupplier } from '@/lib/operations/purchasing';

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactName: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  gstin: z.string().trim().max(20).optional(),
  paymentTerms: z.string().trim().max(60).optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
});

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;

  const json = await req.json().catch(() => null);
  const parsed = supplierSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const d = parsed.data;
    const supplier = await createSupplier({ ...d, email: d.email || undefined });
    return NextResponse.json({ success: true, supplier });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create supplier' }, { status: 400 });
  }
}
