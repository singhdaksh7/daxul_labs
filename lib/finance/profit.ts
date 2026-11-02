import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { rupeesToPaise, splitPaiseDeterministically } from './money';
import { recordPartnerLedgerEntry } from './ledger';

export interface CreateProfitPeriodParams {
  periodName: string; // e.g. "November 2026"
  startDate: Date;
  endDate: Date;
  notes?: string;
}

/**
 * Creates or aggregates monthly Profit & Loss for a period.
 * Only deducts legitimate operating expenses (not double counting inventory purchases or capital equipment).
 */
export async function calculatePeriodProfit(periodId: string) {
  const period = await prisma.profitPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) throw new Error(`ProfitPeriod ${periodId} not found`);

  // 1. Order Revenues and COGS within period
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: period.startDate, lte: period.endDate },
      paymentStatus: 'paid',
    },
    include: { costSnapshot: true },
  });

  let totalRevenueRupees = 0;
  let totalCogsRupees = 0;
  let totalRefundsRupees = 0;

  for (const order of orders) {
    totalRevenueRupees += order.totalAmount;
    totalRefundsRupees += order.refundedAmount || 0;
    if (order.costSnapshot) {
      totalCogsRupees += order.costSnapshot.totalCOGS;
    }
  }

  // 2. Operating Expenses within period (strictly OPERATING_EXPENSE classification)
  const opexExpenses = await prisma.businessExpense.findMany({
    where: {
      expenseDate: { gte: period.startDate, lte: period.endDate },
      status: { not: 'CANCELLED' },
      classification: 'OPERATING_EXPENSE',
    },
  });

  // Money the business repaid to partners for REVENUE-recovery purchases (e.g. an EMI printer) leaves the
  // distributable pool, otherwise the same cash would be both repaid and shared out as profit.
  const recoveryAgg = await prisma.expenseRevenueRecovery.aggregate({
    where: {
      recoveredAt: { gte: period.startDate, lte: period.endDate },
      expense: { status: { not: 'CANCELLED' } },
    },
    _sum: { amountPaise: true },
  });
  const revenueRecoveryPaise = recoveryAgg._sum.amountPaise ?? BigInt(0);

  const totalOpexPaise = opexExpenses.reduce((acc, e) => acc + e.totalAmountPaise, BigInt(0));

  const totalRevenuePaise = rupeesToPaise(totalRevenueRupees);
  const totalRefundsPaise = rupeesToPaise(totalRefundsRupees);
  const totalCogsPaise = rupeesToPaise(totalCogsRupees);

  const grossProfitPaise = totalRevenuePaise - totalRefundsPaise - totalCogsPaise;
  const netDistributablePaise = grossProfitPaise - totalOpexPaise - revenueRecoveryPaise;

  return await prisma.profitPeriod.update({
    where: { id: period.id },
    data: {
      totalRevenuePaise,
      totalRefundsPaise,
      totalCogsPaise,
      operatingExpensePaise: totalOpexPaise,
      revenueRecoveryPaise,
      grossProfitPaise,
      netDistributablePaise: netDistributablePaise > BigInt(0) ? netDistributablePaise : BigInt(0),
    },
  });
}

/**
 * Locks the period and allocates distributable net profit according to historical profit percentage snapshots.
 * Historical allocations become completely immutable after locking.
 */
export async function lockAndDistributeProfitPeriod(params: {
  periodId: string;
  lockedBy: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const period = await tx.profitPeriod.findUnique({
      where: { id: params.periodId },
      include: { allocations: true },
    });
    if (!period) throw new Error(`ProfitPeriod ${params.periodId} not found`);

    if (period.status === 'LOCKED' || period.status === 'DISTRIBUTED') {
      throw new Error(`Period is already ${period.status}`);
    }

    // Fetch active partners
    const activePartners = await tx.businessPartner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const partnerSplits = activePartners.map((p) => ({
      id: p.id,
      splitPercentage: p.profitSplitPercentage,
    }));

    // Split distributable profit
    const allocations = splitPaiseDeterministically(period.netDistributablePaise, partnerSplits);

    // Lock period
    const now = new Date();
    await tx.profitPeriod.update({
      where: { id: period.id },
      data: {
        status: 'DISTRIBUTED',
        lockedBy: params.lockedBy,
        lockedAt: now,
      },
    });

    // Create allocation snapshots and ledger credits
    for (const alloc of allocations) {
      await tx.partnerProfitAllocation.create({
        data: {
          profitPeriodId: period.id,
          partnerId: alloc.partnerId,
          profitPercentSnapshot: alloc.percentageSnapshot,
          allocatedAmountPaise: alloc.amountPaise,
        },
      });

      if (alloc.amountPaise > BigInt(0)) {
        await recordPartnerLedgerEntry(
          {
            partnerId: alloc.partnerId,
            type: 'PROFIT_ALLOCATION',
            amountPaise: alloc.amountPaise,
            direction: 'CREDIT',
            description: `Profit allocation for ${period.periodName} (${alloc.percentageSnapshot}%)`,
            createdBy: params.lockedBy,
          },
          tx,
        );
      }
    }

    return { success: true, periodId: period.id, distributedCount: allocations.length };
  });
}

