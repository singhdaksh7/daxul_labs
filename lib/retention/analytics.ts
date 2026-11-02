import { prisma } from '@/lib/db';

export async function calculateRetentionAnalytics() {
  const usersWithOrders = await prisma.user.findMany({
    include: {
      orders: {
        where: { paymentStatus: 'paid' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, totalAmount: true, createdAt: true },
      },
    },
  });

  const totalUsersWithAtLeastOnePaid = usersWithOrders.filter((u) => u.orders.length > 0);
  const newCustomersCount = usersWithOrders.filter((u) => u.orders.length === 1).length;
  const repeatCustomersCount = usersWithOrders.filter((u) => u.orders.length > 1).length;
  const totalPaidCustomers = totalUsersWithAtLeastOnePaid.length;

  const repeatPurchaseRate =
    totalPaidCustomers > 0 ? (repeatCustomersCount / totalPaidCustomers) * 100 : 0;

  let totalPaidOrdersCount = 0;
  let totalPaidRevenue = 0;
  let repeatRevenue = 0;
  let daysToSecondOrderSum = 0;
  let secondOrderCount = 0;

  for (const u of usersWithOrders) {
    const orders = u.orders;
    totalPaidOrdersCount += orders.length;
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      totalPaidRevenue += o.totalAmount;
      if (i > 0) {
        repeatRevenue += o.totalAmount;
        if (i === 1) {
          const firstDate = new Date(orders[0].createdAt).getTime();
          const secondDate = new Date(o.createdAt).getTime();
          const days = Math.floor((secondDate - firstDate) / (1000 * 60 * 60 * 24));
          daysToSecondOrderSum += Math.max(0, days);
          secondOrderCount++;
        }
      }
    }
  }

  const averageOrdersPerCustomer =
    totalPaidCustomers > 0 ? totalPaidOrdersCount / totalPaidCustomers : 0;
  const averageLTV = totalPaidCustomers > 0 ? totalPaidRevenue / totalPaidCustomers : 0;
  const averageDaysToSecondOrder =
    secondOrderCount > 0 ? daysToSecondOrderSum / secondOrderCount : 0;

  // Ledger-backed Loyalty, Referral, Gift Card, and Store Credit totals
  const [
    loyaltyEarnedAgg,
    loyaltyRedeemedAgg,
    loyaltyOutstandingAgg,
    giftCardLiabilityAgg,
    giftCardSalesAgg,
    storeCreditLiabilityAgg,
    referralCount,
    rewardedReferralCount,
  ] = await Promise.all([
    prisma.loyaltyAccount.aggregate({ _sum: { lifetimeEarned: true } }),
    prisma.loyaltyAccount.aggregate({ _sum: { lifetimeRedeemed: true } }),
    prisma.loyaltyAccount.aggregate({ _sum: { availablePoints: true } }),
    prisma.giftCard.aggregate({ _sum: { remainingBalance: true } }),
    prisma.giftCard.aggregate({ _sum: { originalAmount: true } }),
    prisma.storeCreditAccount.aggregate({ _sum: { availableBalance: true } }),
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'REWARDED' } }),
  ]);

  const referralConversionRate =
    referralCount > 0 ? (rewardedReferralCount / referralCount) * 100 : 0;

  // Cohort analysis (Monthly cohorts)
  const cohortMap = new Map<string, { cohortSize: number; month0: number; month1: number; month2: number; month3: number }>();

  for (const u of totalUsersWithAtLeastOnePaid) {
    const firstOrder = u.orders[0];
    const d = new Date(firstOrder.createdAt);
    const cohortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!cohortMap.has(cohortKey)) {
      cohortMap.set(cohortKey, { cohortSize: 0, month0: 0, month1: 0, month2: 0, month3: 0 });
    }
    const cohort = cohortMap.get(cohortKey)!;
    cohort.cohortSize++;
    cohort.month0++; // placed initial order

    const firstMonthIndex = d.getFullYear() * 12 + d.getMonth();
    for (let i = 1; i < u.orders.length; i++) {
      const orderDate = new Date(u.orders[i].createdAt);
      const orderMonthIndex = orderDate.getFullYear() * 12 + orderDate.getMonth();
      const diff = orderMonthIndex - firstMonthIndex;
      if (diff === 1) cohort.month1++;
      else if (diff === 2) cohort.month2++;
      else if (diff === 3) cohort.month3++;
    }
  }

  const cohorts = Array.from(cohortMap.entries()).map(([cohortName, data]) => ({
    cohort: cohortName,
    cohortSize: data.cohortSize,
    month0Rate: 100,
    month1Rate: data.cohortSize > 0 ? (data.month1 / data.cohortSize) * 100 : 0,
    month2Rate: data.cohortSize > 0 ? (data.month2 / data.cohortSize) * 100 : 0,
    month3Rate: data.cohortSize > 0 ? (data.month3 / data.cohortSize) * 100 : 0,
  }));

  return {
    kpis: {
      newCustomersCount,
      repeatCustomersCount,
      repeatPurchaseRate: Number(repeatPurchaseRate.toFixed(1)),
      averageOrdersPerCustomer: Number(averageOrdersPerCustomer.toFixed(2)),
      averageLTV: Math.round(averageLTV),
      averageDaysToSecondOrder: Math.round(averageDaysToSecondOrder),
      revenueFromRepeatCustomers: Math.round(repeatRevenue),
      totalPaidRevenue: Math.round(totalPaidRevenue),
    },
    ledgerMetrics: {
      loyaltyPointsEarned: loyaltyEarnedAgg._sum.lifetimeEarned || 0,
      loyaltyPointsRedeemed: loyaltyRedeemedAgg._sum.lifetimeRedeemed || 0,
      loyaltyPointsOutstanding: loyaltyOutstandingAgg._sum.availablePoints || 0,
      giftCardSales: giftCardSalesAgg._sum.originalAmount || 0,
      giftCardOutstandingLiability: giftCardLiabilityAgg._sum.remainingBalance || 0,
      storeCreditOutstandingLiability: storeCreditLiabilityAgg._sum.availableBalance || 0,
      referralConversionRate: Number(referralConversionRate.toFixed(1)),
    },
    cohorts,
  };
}

