import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { configureBusinessPartner, validateActivePartnerSplits } from '@/lib/finance/partners';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [partners, availableUsers, splitValidation] = await Promise.all([
    prisma.businessPartner.findMany({
      include: {
        financialAccount: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: { id: true, name: true, email: true, role: true },
    }),
    validateActivePartnerSplits(),
  ]);

  // Serialise BigInt values to string safely for JSON
  const safePartners = partners.map((p) => ({
    ...p,
    financialAccount: p.financialAccount
      ? {
          ...p.financialAccount,
          capitalContributedPaise: p.financialAccount.capitalContributedPaise.toString(),
          expensePaidPersonallyPaise: p.financialAccount.expensePaidPersonallyPaise.toString(),
          amountPayablePaise: p.financialAccount.amountPayablePaise.toString(),
          amountReceivablePaise: p.financialAccount.amountReceivablePaise.toString(),
          profitAllocatedPaise: p.financialAccount.profitAllocatedPaise.toString(),
          profitWithdrawnPaise: p.financialAccount.profitWithdrawnPaise.toString(),
          netSettlementPositionPaise: p.financialAccount.netSettlementPositionPaise.toString(), reimbursementDuePaise: p.financialAccount.reimbursementDuePaise.toString(),
        }
      : null,
  }));

  return NextResponse.json({
    partners: safePartners,
    availableUsers,
    splitValidation,
  });
}

const configurePartnerSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(2),
  phone: z.string().optional().nullable(),
  ownershipPercentage: z.number().min(0).max(100),
  expenseSplitPercentage: z.number().min(0).max(100),
  profitSplitPercentage: z.number().min(0).max(100),
  isPrimarySettlementPartner: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only SUPER_ADMIN can configure or change partner ownership / splits
  if (check.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required to manage business partners' }, { status: 403 });
  }

  const json = await req.json();
  const parsed = configurePartnerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    // Accept either the user id or the login email (case-insensitive).
    const ref = parsed.data.userId.trim();
    const user = ref.includes('@')
      ? await prisma.user.findUnique({ where: { email: ref.toLowerCase() } })
      : await prisma.user.findUnique({ where: { id: ref } });
    if (!user) {
      return NextResponse.json(
        { error: 'No account found for that email/ID. Add them first under Staff & Permissions, then configure them here.' },
        { status: 404 },
      );
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'That account is not an admin yet. Add them under Staff & Permissions (ADMIN or SUPER_ADMIN) first.' },
        { status: 400 },
      );
    }

    const partner = await configureBusinessPartner({
      userId: user.id,
      displayName: parsed.data.displayName,
      email: user.email,
      phone: parsed.data.phone,
      ownershipPercentage: parsed.data.ownershipPercentage,
      expenseSplitPercentage: parsed.data.expenseSplitPercentage,
      profitSplitPercentage: parsed.data.profitSplitPercentage,
      isPrimarySettlementPartner: parsed.data.isPrimarySettlementPartner,
      notes: parsed.data.notes,
    });

    const adminUserId = (check.session?.user as any)?.id || 'admin';
    const adminUserEmail = check.session?.user?.email || 'admin@daxullabs.com';

    // Record audit log for partner split configuration
    await prisma.auditLog.create({
      data: {
        adminUserId,
        adminUserEmail,
        action: 'PARTNER_CONFIGURED',
        entityType: 'BusinessPartner',
        entityId: partner.id,
        details: {
          displayName: partner.displayName,
          ownershipPercentage: partner.ownershipPercentage,
          expenseSplitPercentage: partner.expenseSplitPercentage,
          profitSplitPercentage: partner.profitSplitPercentage,
          isPrimarySettlementPartner: partner.isPrimarySettlementPartner,
        },
      },
    });

    const safeP = JSON.parse(JSON.stringify(partner, (k, v) => typeof v === 'bigint' ? v.toString() : v)); return NextResponse.json({ success: true, partner: safeP });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to configure partner' }, { status: 400 });
  }
}


