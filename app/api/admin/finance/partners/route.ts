import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateDefaultPartners } from '@/lib/finance/partners';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure default 3 partners exist
  await getOrCreateDefaultPartners();

  const [partners, accounts, recentLedger] = await Promise.all([
    prisma.businessPartner.findMany({
      include: {
        financialAccount: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.partnerFinancialAccount.findMany({
      include: { partner: true },
    }),
    prisma.partnerLedgerEntry.findMany({
      include: { partner: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  // Serialise BigInt values to string/number safely for JSON
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
          netSettlementPositionPaise: p.financialAccount.netSettlementPositionPaise.toString(),
        }
      : null,
  }));

  const safeLedger = recentLedger.map((l) => ({
    ...l,
    amountPaise: l.amountPaise.toString(),
    balanceAfterPaise: l.balanceAfterPaise.toString(),
  }));

  return NextResponse.json({
    partners: safePartners,
    recentLedger: safeLedger,
  });
}

