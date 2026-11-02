import { prisma } from '@/lib/db';
import { ExpenseCategory, AccountingClassification, Prisma } from '@prisma/client';
import { rupeesToPaise, splitPaiseDeterministically } from './money';
import { recordPartnerLedgerEntry } from './ledger';
import { getOrCreateDefaultPartners } from './partners';

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
    const partners = await tx.businessPartner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (partners.length === 0) {
      await getOrCreateDefaultPartners(tx);
    }
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

