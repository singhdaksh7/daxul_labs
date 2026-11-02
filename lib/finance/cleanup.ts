import { prisma } from '@/lib/db';
import { cancelBusinessExpense } from './expenses';

/**
 * Bulk clean-up of finance test data. SUPER_ADMIN only (enforced by the route).
 *  - Every ACTIVE expense and EMI is cancelled through cancelBusinessExpense, which reverses what it posted to
 *    the partner accounts and keeps the audit trail.
 *  - Partners that are not in the keep list are deleted (their data cascades); if that is blocked by a link,
 *    they are deactivated instead. Login accounts are never touched.
 */
export async function previewFinanceCleanup() {
  const [partners, expenses, settlements, capitalEntries, profitPeriods] = await Promise.all([
    prisma.businessPartner.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.businessExpense.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, expenseNumber: true, title: true, isEmi: true, totalAmountPaise: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.partnerSettlement.count(),
    prisma.partnerCapitalEntry.count(),
    prisma.profitPeriod.count(),
  ]);
  return {
    partners: partners.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      email: p.user?.email ?? p.email,
      isActive: p.isActive,
      ownershipPercentage: p.ownershipPercentage,
    })),
    expenses: expenses.map((e) => ({ ...e, totalAmountPaise: e.totalAmountPaise.toString() })),
    otherRecords: { settlements, capitalEntries, profitPeriods },
  };
}

export async function runFinanceCleanup(params: { keepPartnerIds: string[]; createdBy: string }) {
  const keep = new Set(params.keepPartnerIds);
  const expenses = await prisma.businessExpense.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { id: true, expenseNumber: true, title: true },
    orderBy: { createdAt: 'desc' },
  });

  const cancelled: string[] = [];
  const blocked: { expense: string; reason: string }[] = [];
  for (const e of expenses) {
    try {
      await cancelBusinessExpense({ expenseId: e.id, reason: 'Bulk clean-up of test data', createdBy: params.createdBy });
      cancelled.push(e.expenseNumber);
    } catch (err) {
      blocked.push({ expense: `${e.expenseNumber} ${e.title}`, reason: err instanceof Error ? err.message : 'Failed' });
    }
  }

  const partners = await prisma.businessPartner.findMany({ select: { id: true, displayName: true } });
  const removed: string[] = [];
  const deactivated: string[] = [];
  for (const p of partners) {
    if (keep.has(p.id)) continue;
    try {
      await prisma.businessPartner.delete({ where: { id: p.id } });
      removed.push(p.displayName);
    } catch {
      await prisma.businessPartner.update({ where: { id: p.id }, data: { isActive: false, isPrimarySettlementPartner: false } });
      deactivated.push(p.displayName);
    }
  }
  return { cancelled, blocked, removedPartners: removed, deactivatedPartners: deactivated };
}
