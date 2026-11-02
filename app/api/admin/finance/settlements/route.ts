import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { submitPartnerSettlement, verifyPartnerSettlement } from '@/lib/finance/settlements';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settlements = await prisma.partnerSettlement.findMany({
    include: {
      fromPartner: { select: { id: true, displayName: true } },
      toPartner: { select: { id: true, displayName: true } },
      allocations: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const safeSettlements = settlements.map((s) => ({
    ...s,
    amountPaise: s.amountPaise.toString(),
    allocations: s.allocations.map((a) => ({
      ...a,
      amountAllocatedPaise: a.amountAllocatedPaise.toString(),
    })),
  }));

  return NextResponse.json({ settlements: safeSettlements });
}

const settlementSchema = z.object({
  fromPartnerId: z.string().min(1),
  toPartnerId: z.string().min(1),
  amountRupees: z.number().positive(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
  proofMediaUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = settlementSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const adminId = (check.session?.user as any)?.id || 'admin';
    const settlement = await submitPartnerSettlement({
      ...parsed.data,
      referenceNumber: parsed.data.referenceNumber || undefined,
      proofMediaUrl: parsed.data.proofMediaUrl || undefined,
      notes: parsed.data.notes || undefined,
      createdBy: adminId,
    });

    const safeSettlement = JSON.parse(
      JSON.stringify(settlement, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
    );
    return NextResponse.json({ success: true, settlement: safeSettlement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit settlement' }, { status: 400 });
  }
}

const verifySchema = z.object({
  settlementId: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = verifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const adminId = (check.session?.user as any)?.id || 'admin';
    // Resolve verifier's BusinessPartner record if exists
    const verifierPartner = await prisma.businessPartner.findUnique({
      where: { userId: adminId },
    });

    const verified = await verifyPartnerSettlement({
      settlementId: parsed.data.settlementId,
      verifierPartnerId: verifierPartner?.id || adminId,
      verifierUserRole: check.role,
    });

    return NextResponse.json({ success: true, settlement: verified });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 400 });
  }
}

