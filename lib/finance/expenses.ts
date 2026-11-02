import { prisma } from '@/lib/db';
import { ExpenseCategory, AccountingClassification, Prisma } from '@prisma/client';
import { rupeesToPaise, splitPaiseDeterministically } from './money';
import { recordPartnerLedgerEntry } from './ledger';

export interface CreateExpenseParams {
  title: string;
  description?: string;
  category: ExpenseCategory;
  classification?: AccountingClassification;
  vendor?: string;
  invoiceNumber?: string;
  expenseDate?: Date;
  totalAmountRupees: number;
  taxAmountRupees?: number;
  paymentMethod?: string;
  paidByPartnerId?: string;
  isBusinessAccountPaid?: boolean;
  notes?: string;
  createdBy: string;
  // Optional custom splits
  customSplits?: Array<{ partnerId: string; percentage: number }>;
}

/**
 * Creates a business expense, records deterministic partner shares, and writes immutable ledger entries.
 */
export async function createBusinessExpense(
  params: CreateExpenseParams,
  txClient?: Prisma.TransactionClient,
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    // Generate expense number
    const count = await tx.businessExpense.count();
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const expenseNumber = `DXL-EXP-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    const totalAmountPaise = rupeesToPaise(params.totalAmountRupees);
    const taxAmountPaise = rupeesToPaise(params.taxAmountRupees || 0);

    // Fetch active partners
    const activePartners = await tx.businessPartner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const splitConfig = params.customSplits
      ? params.customSplits.map((cs) => ({ id: cs.partnerId, splitPercentage: cs.percentage }))
      : activePartners.map((p) => ({ id: p.id, splitPercentage: p.expenseSplitPercentage }));

    const shares = splitPaiseDeterministically(totalAmountPaise, splitConfig);

    const expense = await tx.businessExpense.create({
      data: {
        expenseNumber,
        title: params.title,
        description: params.description,
        category: params.category,
        classification: params.classification || 'OPERATING_EXPENSE',
        vendor: params.vendor,
        invoiceNumber: params.invoiceNumber,
        expenseDate: params.expenseDate || new Date(),
        totalAmountPaise,
        taxAmountPaise,
        paymentMethod: params.paymentMethod || 'UPI',
        paidByPartnerId: params.paidByPartnerId,
        isBusinessAccountPaid: params.isBusinessAccountPaid || false,
        splitMethod: params.customSplits ? 'CUSTOM_PERCENTAGE' : 'EQUAL',
        status: 'ACTIVE',
        notes: params.notes,
        createdBy: params.createdBy,
        shares: {
          create: shares.map((s) => ({
            partnerId: s.partnerId,
            percentageSnapshot: s.percentageSnapshot,
            shareAmountPaise: s.amountPaise,
            remainingPaise: s.amountPaise,
            status: 'UNPAID',
          })),
        },
      },
      include: {
        shares: {
          include: { partner: true },
        },
      },
    });

    // Ledger Impact:
    // If paid personally by a partner:
    // 1. Credit the paying partner with full expense amount paid
    // 2. Debit each partner with their respective expense share due
    if (!params.isBusinessAccountPaid && params.paidByPartnerId) {
      await recordPartnerLedgerEntry(
        {
          partnerId: params.paidByPartnerId,
          type: 'EXPENSE_PAID',
          amountPaise: totalAmountPaise,
          direction: 'CREDIT',
          description: `Personally paid for expense ${expenseNumber}: ${params.title}`,
          createdBy: params.createdBy,
          expenseId: expense.id,
        },
        tx,
      );
    }

    // Debit each partner for their own share due
    for (const share of shares) {
      await recordPartnerLedgerEntry(
        {
          partnerId: share.partnerId,
          type: 'EXPENSE_SHARE_DUE',
          amountPaise: share.amountPaise,
          direction: 'DEBIT',
          description: `Share of expense ${expenseNumber}: ${params.title} (${share.percentageSnapshot}%)`,
          createdBy: params.createdBy,
          expenseId: expense.id,
        },
        tx,
      );
    }

    return expense;
  };

  if (txClient) return await runner(txClient);
  return await prisma.$transaction(runner);
}


export class ExpenseCancelError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Cancels an expense AND reverses everything it posted to the partner accounts (immutable REVERSAL ledger
 * entries, accumulators put back), so balances are correct afterwards. Refused when any partner has already
 * paid towards it, or when it is an EMI purchase (those have their own installment trail).
 */
export async function cancelBusinessExpense(params: { expenseId: string; reason: string; createdBy: string }) {
  return await prisma.$transaction(async (tx) => {
    const expense = await tx.businessExpense.findUnique({
      where: { id: params.expenseId },
      include: { shares: true, emiSchedule: { include: { installments: { include: { partnerObligations: true } } } } },
    });
    if (!expense) throw new ExpenseCancelError('Expense not found', 404);
    if (expense.status === 'CANCELLED') throw new ExpenseCancelError('This expense is already cancelled');
    const emiInstallments = expense.emiSchedule?.installments ?? [];
    const emiPaidByOthers = emiInstallments.some((i) =>
      i.partnerObligations.some((o) => o.partnerId !== expense.paidByPartnerId && o.amountPaidPaise > BigInt(0)),
    );
    if (emiPaidByOthers) {
      throw new ExpenseCancelError('A partner has already paid towards this EMI, so it cannot be cancelled.');
    }
    if (expense.shares.some((s) => s.paidAmountPaise > BigInt(0))) {
      throw new ExpenseCancelError('A partner has already paid towards this expense, so it cannot be cancelled.');
    }

    const entries = await tx.partnerLedgerEntry.findMany({
      where: { expenseId: expense.id, type: { in: ['EXPENSE_PAID', 'EXPENSE_SHARE_DUE', 'EMI_SHARE_DUE'] } },
    });
    const already = await tx.partnerLedgerEntry.findMany({
      where: { type: 'REVERSAL', reversedEntryId: { in: entries.map((e) => e.id) } },
      select: { reversedEntryId: true },
    });
    const done = new Set(already.map((a) => a.reversedEntryId));

    for (const e of entries) {
      if (done.has(e.id)) continue;
      const account = await tx.partnerFinancialAccount.findUnique({ where: { partnerId: e.partnerId } });
      if (!account) throw new ExpenseCancelError('Partner account missing; cannot reverse', 500);
      // Original CREDIT added to the net position, DEBIT subtracted. The reversal does the opposite.
      const reverseDirection = e.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
      const delta = reverseDirection === 'CREDIT' ? e.amountPaise : -e.amountPaise;
      const newNet = account.netSettlementPositionPaise + delta;
      await tx.partnerLedgerEntry.create({
        data: {
          partnerId: e.partnerId,
          type: 'REVERSAL',
          amountPaise: e.amountPaise,
          direction: reverseDirection,
          balanceAfterPaise: newNet,
          description: `Reversal (expense ${expense.expenseNumber} cancelled): ${e.description}`,
          createdBy: params.createdBy,
          expenseId: expense.id,
          reversedEntryId: e.id,
        },
      });
      await tx.partnerFinancialAccount.update({
        where: { partnerId: e.partnerId },
        data:
          e.type === 'EXPENSE_PAID'
            ? {
                netSettlementPositionPaise: newNet,
                expensePaidPersonallyPaise: { decrement: e.amountPaise },
                amountReceivablePaise: { decrement: e.amountPaise },
              }
            : { netSettlementPositionPaise: newNet, amountPayablePaise: { decrement: e.amountPaise } },
      });
    }

    if (emiInstallments.length > 0) {
      const ids = emiInstallments.map((i) => i.id);
      await tx.partnerEmiObligation.updateMany({
        where: { emiInstallmentId: { in: ids } },
        data: { status: 'CANCELLED', remainingPaise: BigInt(0) },
      });
      await tx.expenseEmiInstallment.updateMany({ where: { id: { in: ids } }, data: { status: 'CANCELLED' } });
    }
    await tx.partnerExpenseShare.updateMany({
      where: { expenseId: expense.id },
      data: { status: 'WAIVED', remainingPaise: BigInt(0) },
    });
    return await tx.businessExpense.update({
      where: { id: expense.id },
      data: { status: 'CANCELLED', notes: params.reason },
    });
  });
}
