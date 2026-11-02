import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { submitPartnerSettlement } from '@/lib/finance/settlements';
import { z } from 'zod';

const settlementSchema = z.object({
  amountRupees: z.number().positive(),
  paymentMethod: z.string().default('UPI'),
  transactionReference: z.string().optional().nullable(),
  proofFileUrl: z.string().optional().nullable(),
  payerPartnerId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partner = await prisma.businessPartner.findFirst({
    where: {
      user: { email: session.user.email.toLowerCase() },
      isActive: true,
    },
  });

  if (!partner) {
    return NextResponse.json({ error: 'No active partner profile linked' }, { status: 403 });
  }

  const primaryPartner = await prisma.businessPartner.findFirst({
    where: { isPrimarySettlementPartner: true, isActive: true },
  });

  if (!primaryPartner) {
    return NextResponse.json({ error: 'Primary settlement partner not configured' }, { status: 400 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = settlementSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const settlement = await submitPartnerSettlement({
    fromPartnerId: partner.id,
    toPartnerId: primaryPartner.id,
    amountRupees: parsed.data.amountRupees,
    paymentMethod: parsed.data.paymentMethod,
    referenceNumber: parsed.data.transactionReference || undefined,
    proofMediaUrl: parsed.data.proofFileUrl || undefined,
    createdBy: (session.user as any).id || partner.userId,
  });

  const safeSettlement = JSON.parse(
    JSON.stringify(settlement, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
  );

  return NextResponse.json({ success: true, settlement: safeSettlement });
}

