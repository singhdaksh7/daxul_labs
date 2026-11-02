import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { paiseToRupees } from '@/lib/finance/money';
import { getOrCreateDefaultPartners } from '@/lib/finance/partners';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getOrCreateDefaultPartners();

  const [partners, expenses, settlements, emiInstallments, capitalEntries, orders] = await Promise.all([
    prisma.businessPartner.findMany({
      include: { financialAccount: true },
    }),
    prisma.businessExpense.findMany({
      where: { status: { not: 'CANCELLED' } },
    }),
    prisma.partnerSettlement.findMany({
      where: { status: 'PENDING_VERIFICATION' },
    }),
    prisma.expenseEmiInstallment.findMany({
      where: { status: { in: ['UNPAID', 'OVERDUE', 'PARTIALLY_PAID'] } },
    }),
    prisma.partnerCapitalEntry.findMany(),
    prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { totalAmount: true },
    }),
  ]);

  const totalBusinessRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalBusinessExpensesPaise = expenses.reduce((acc, e) => acc + e.totalAmountPaise, BigInt(0));
  const totalCapitalInvestedPaise = capitalEntries.reduce((acc, c) => acc + c.amountPaise, BigInt(0));

  // Find Daksh Partner
  const daksh = partners.find((p) => p.isPrimarySettlementPartner);
  const dakshReceivablePaise = daksh?.financialAccount?.amountReceivablePaise || BigInt(0);

  // Total partner outstanding dues
  const totalPartnerDuesPaise = partners.reduce((acc, p) => acc + (p.financialAccount?.amountPayablePaise || BigInt(0)), BigInt(0));

  return NextResponse.json({
    metrics: {
      totalBusinessRevenue,
      totalBusinessExpensesRupees: paiseToRupees(totalBusinessExpensesPaise),
      totalCapitalInvestedRupees: paiseToRupees(totalCapitalInvestedPaise),
      dakshReceivableRupees: paiseToRupees(dakshReceivablePaise),
      totalPartnerDuesRupees: paiseToRupees(totalPartnerDuesPaise),
      unverifiedSettlementsCount: settlements.length,
      pendingEmiInstallmentsCount: emiInstallments.length,
    },
    partners: partners.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      email: p.email,
      ownershipPercentage: p.ownershipPercentage,
      isPrimarySettlementPartner: p.isPrimarySettlementPartner,
      capitalContributedRupees: paiseToRupees(p.financialAccount?.capitalContributedPaise || BigInt(0)),
      expensesPersonallyPaidRupees: paiseToRupees(p.financialAccount?.expensePaidPersonallyPaise || BigInt(0)),
      amountPayableRupees: paiseToRupees(p.financialAccount?.amountPayablePaise || BigInt(0)),
      amountReceivableRupees: paiseToRupees(p.financialAccount?.amountReceivablePaise || BigInt(0)),
      profitAllocatedRupees: paiseToRupees(p.financialAccount?.profitAllocatedPaise || BigInt(0)),
      netSettlementPositionRupees: paiseToRupees(p.financialAccount?.netSettlementPositionPaise || BigInt(0)),
    })),
  });
}

