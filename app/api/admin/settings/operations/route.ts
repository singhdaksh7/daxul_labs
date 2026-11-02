import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOperationsSettings, DEFAULT_OPERATIONS_SETTINGS } from '@/lib/operations/settings';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getOperationsSettings();
  return NextResponse.json({ settings });
}

const updateSettingsSchema = z.object({
  rawMaterialsEnabled: z.boolean().optional(),
  bomEnabled: z.boolean().optional(),
  purchasingEnabled: z.boolean().optional(),
  courierIntegrationEnabled: z.boolean().optional(),
  advancedCostingEnabled: z.boolean().optional(),
  staffRbacEnabled: z.boolean().optional(),
  courierProvider: z.string().optional(),
  kwhElectricityRate: z.number().min(0).optional(),
  standardHourlyLaborRate: z.number().min(0).optional(),
  poApprovalThreshold: z.number().min(0).optional(),
  targetGrossMarginPercent: z.number().min(0).max(100).optional(),
});

export async function PUT(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only SUPER_ADMIN can adjust core operational / economic thresholds
  if (check.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required' }, { status: 403 });
  }

  const json = await req.json();
  const parsed = updateSettingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.operationsSettings.upsert({
    where: { id: 'default' },
    create: {
      ...DEFAULT_OPERATIONS_SETTINGS,
      ...parsed.data,
      id: 'default',
    },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, settings: updated });
}

