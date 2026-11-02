import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { paiseToRupees } from '@/lib/finance/money';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find partner record associated with the authenticated user
  const partner = await prisma.businessPartner.findFirst({
    where: {
      user: { email: session.user.email.toLowerCase() },
      isActive: true,
    },
    include: {
      financialAccount: true,
      expenseShares: {
        where: { status: { not: 'PAID' } },
        include: {
          expense: {
            select: { id: true, expenseNumber: true, title: true, expenseDate: true, category: true },
          },
        },
      },
      emiObligations: {
        where: { status: { not: 'PAID' } },
        include: {
          emiInstallment: {
            include: {
              emiSchedule: {
                include: {
                  expense: { select: { id: true, expenseNumber: true, title: true } },
                },
              },
            },
          },
          payableToPartner: { select: { id: true, displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
      settlementsSent: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      profitAllocations: {
        include: {
          profitPeriod: { select: { id: true, periodName: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      ledgerEntries: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  });

  if (!partner) {
    return NextResponse.json(
      { error: 'No active partner profile linked to your user account' },
      { status: 403 },
    );
  }

  const account = partner.financialAccount;

  return NextResponse.json({
    partner: {
      id: partner.id,
      displayName: partner.displayName,
      email: partner.email,
      ownershipPercentage: partner.ownershipPercentage,
      expenseSplitPercentage: partner.expenseSplitPercentage,
      profitSplitPercentage: partner.profitSplitPercentage,
      isPrimarySettlementPartner: partner.isPrimarySettlementPartner,
    },
    summary: {
      capitalContributedRupees: paiseToRupees(account?.capitalContributedPaise || BigInt(0)),
      expensesPersonallyPaidRupees: paiseToRupees(account?.expensePaidPersonallyPaise || BigInt(0)),
      amountPayableRupees: paiseToRupees(account?.amountPayablePaise || BigInt(0)),
      amountReceivableRupees: paiseToRupees(account?.amountReceivablePaise || BigInt(0)),
      profitAllocatedRupees: paiseToRupees(account?.profitAllocatedPaise || BigInt(0)),
      profitWithdrawnRupees: paiseToRupees(account?.profitWithdrawnPaise || BigInt(0)),
      netSettlementPositionRupees: paiseToRupees(account?.netSettlementPositionPaise || BigInt(0)),
    },
    unpaidExpenseShares: partner.expenseShares.map((s) => ({
      id: s.id,
      expenseTitle: s.expense.title,
      expenseNumber: s.expense.expenseNumber,
      shareAmountRupees: paiseToRupees(s.shareAmountPaise),
      paidAmountRupees: paiseToRupees(s.paidAmountPaise),
      remainingRupees: paiseToRupees(s.remainingPaise),
      status: s.status,
    })),
    unpaidEmiObligations: partner.emiObligations.map((o) => ({
      id: o.id,
      expenseTitle: o.emiInstallment.emiSchedule.expense.title,
      installmentNumber: o.emiInstallment.installmentNumber,
      dueDate: o.dueDate,
      payableTo: o.payableToPartner?.displayName || 'Primary Settlement Partner',
      shareAmountRupees: paiseToRupees(o.shareAmountPaise),
      paidAmountRupees: paiseToRupees(o.amountPaidPaise),
      remainingRupees: paiseToRupees(o.remainingPaise),
      status: o.status,
    })),
    settlementsHistory: partner.settlementsSent.map((stl) => ({
      id: stl.id,
      settlementNumber: stl.settlementNumber,
      amountRupees: paiseToRupees(stl.amountPaise),
      paymentDate: stl.paymentDate,
      status: stl.status,
      proofMediaUrl: stl.proofMediaUrl,
    })),
    recentLedger: partner.ledgerEntries.map((l) => ({
      id: l.id,
      type: l.type,
      amountRupees: paiseToRupees(l.amountPaise),
      direction: l.direction,
      balanceAfterRupees: paiseToRupees(l.balanceAfterPaise),
      description: l.description,
      createdAt: l.createdAt,
    })),
  });
}

