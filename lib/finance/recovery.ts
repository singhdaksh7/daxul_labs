import { prisma } from '@/lib/db';
import { paiseToRupees, rupeesToPaise } from './money';
import { recordPartnerLedgerEntry } from './ledger';

export class RecoveryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** What the paying partner has actually paid out for a REVENUE expense/EMI so far, and what is already recovered. */
export async function getRecoveryPosition(expenseId: string, client: Pick<typeof prisma, 'partnerLedgerEntry' | 'expenseRevenueRecovery'> = prisma) {
  const [paid, recovered] = await Promise.all([
    client.partnerLedgerEntry.aggregate({ where: { expenseId, type: 'EXPENSE_PAID' }, _sum: { amountPaise: true } }),
    client.expenseRevenueRecovery.aggregate({ where: { expenseId }, _sum: { amountPaise: true } }),
  ]);
  const paidOutPaise = paid._sum.amountPaise ?? BigInt(0);
  const recoveredPaise = recovered._sum.amountPaise ?? BigInt(0);
  return { paidOutPaise, recoveredPaise, outstandingPaise: paidOutPaise - recoveredPaise };
}

/**
 * Records that the business repaid the paying partner out of revenue. Cannot exceed what the partner has
 * actually paid out so far (for an EMI: down payment + installments marked paid), minus earlier recoveries.
 */
export async function recordRevenueRecovery(params: {
  expenseId: string;
  amountRupees: number;
  recoveredAt?: Date;
  note?: string;
  createdBy: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const expense = await tx.businessExpense.findUnique({ where: { id: params.expenseId } });
    if (!expense) throw new RecoveryError('Expense not found', 404);
    if (expense.status === 'CANCELLED') throw new RecoveryError('This expense is cancelled');
    if (expense.recoveryMode !== 'REVENUE') throw new RecoveryError('This item is not set to be recovered from revenue');
    if (!expense.paidByPartnerId) throw new RecoveryError('No paying partner on this expense');

    const when = params.recoveredAt ?? new Date();
    if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new RecoveryError('Recovery date cannot be in the future');
    }
    const amountPaise = rupeesToPaise(params.amountRupees);
    if (amountPaise <= BigInt(0)) throw new RecoveryError('Amount must be greater than zero');

    const pos = await getRecoveryPosition(expense.id, tx as never);
    if (amountPaise > pos.outstandingPaise) {
      throw new RecoveryError(
        `Only \u20b9${paiseToRupees(pos.outstandingPaise)} is left to recover so far (recoveries cannot exceed what has been paid out).`,
      );
    }

    const row = await tx.expenseRevenueRecovery.create({
      data: {
        expenseId: expense.id,
        partnerId: expense.paidByPartnerId,
        amountPaise,
        recoveredAt: when,
        note: params.note,
        createdBy: params.createdBy,
      },
    });
    await recordPartnerLedgerEntry(
      {
        partnerId: expense.paidByPartnerId,
        type: 'REVENUE_RECOVERY',
        amountPaise,
        direction: 'DEBIT',
        description: `Recovered from business revenue: ${expense.expenseNumber} ${expense.title}`,
        createdBy: params.createdBy,
        expenseId: expense.id,
      },
      tx,
    );
    return { id: row.id, outstandingPaise: pos.outstandingPaise - amountPaise };
  });
}
