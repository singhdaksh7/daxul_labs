import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { rupeesToPaise, splitPaiseDeterministically } from './money';
import { recordPartnerLedgerEntry } from './ledger';

export interface CreateEmiExpenseParams {
  title: string;
  vendor?: string;
  purchasePriceRupees: number;
  downPaymentRupees?: number;
  totalEmiCount: number;
  frequency?: 'MONTHLY' | 'QUARTERLY';
  firstEmiDate: Date;
  paidByPartnerId: string;
  notes?: string;
  createdBy: string;
}

/**
 * Creates a capital equipment expense financed via EMI.
 * Generates exact installment schedules and partner obligations payable to the financing partner.
 */
export async function createEmiExpenseSchedule(
  params: CreateEmiExpenseParams,
  txClient?: Prisma.TransactionClient,
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const count = await tx.businessExpense.count();
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const expenseNumber = `DXL-EXP-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    const purchasePricePaise = rupeesToPaise(params.purchasePriceRupees);
    const downPaymentPaise = rupeesToPaise(params.downPaymentRupees || 0);
    const financedAmountPaise = purchasePricePaise - downPaymentPaise;

    // Fetch active partners
    const activePartners = await tx.businessPartner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const partnerSplits = activePartners.map((p) => ({
      id: p.id,
      splitPercentage: p.expenseSplitPercentage,
    }));

    // Down payment split
    const downPaymentShares = splitPaiseDeterministically(downPaymentPaise, partnerSplits);

    // Create Parent Expense
    const expense = await tx.businessExpense.create({
      data: {
        expenseNumber,
        title: params.title,
        category: 'THREE_D_PRINTER',
        classification: 'CAPITAL_EXPENSE',
        vendor: params.vendor,
        totalAmountPaise: purchasePricePaise,
        paidByPartnerId: params.paidByPartnerId,
        isEmi: true,
        splitMethod: 'EQUAL',
        status: 'ACTIVE',
        notes: params.notes,
        createdBy: params.createdBy,
        shares: {
          create: downPaymentShares.map((ds) => ({
            partnerId: ds.partnerId,
            percentageSnapshot: ds.percentageSnapshot,
            shareAmountPaise: ds.amountPaise,
            remainingPaise: ds.amountPaise,
            status: ds.amountPaise === BigInt(0) ? 'PAID' : 'UNPAID',
          })),
        },
      },
    });

    // Credit payer for down payment if paid
    if (downPaymentPaise > BigInt(0)) {
      await recordPartnerLedgerEntry(
        {
          partnerId: params.paidByPartnerId,
          type: 'EXPENSE_PAID',
          amountPaise: downPaymentPaise,
          direction: 'CREDIT',
          description: `Down payment for ${expenseNumber}: ${params.title}`,
          createdBy: params.createdBy,
          expenseId: expense.id,
        },
        tx,
      );

      for (const ds of downPaymentShares) {
        await recordPartnerLedgerEntry(
          {
            partnerId: ds.partnerId,
            type: 'EXPENSE_SHARE_DUE',
            amountPaise: ds.amountPaise,
            direction: 'DEBIT',
            description: `Down payment share for ${expenseNumber}: ${params.title}`,
            createdBy: params.createdBy,
            expenseId: expense.id,
          },
          tx,
        );
      }
    }

    // Create EMI Schedule
    const emiSchedule = await tx.expenseEmiSchedule.create({
      data: {
        expenseId: expense.id,
        purchasePricePaise,
        downPaymentPaise,
        financedAmountPaise,
        totalEmiCount: params.totalEmiCount,
        frequency: params.frequency || 'MONTHLY',
        firstEmiDate: params.firstEmiDate,
      },
    });

    // Calculate installment amount
    const baseInstallmentPaise = financedAmountPaise / BigInt(params.totalEmiCount);
    let remainderPaise = financedAmountPaise % BigInt(params.totalEmiCount);

    const installments = [];
    for (let i = 1; i <= params.totalEmiCount; i++) {
      let instAmount = baseInstallmentPaise;
      if (remainderPaise > BigInt(0)) {
        instAmount += BigInt(1);
        remainderPaise -= BigInt(1);
      }

      // Compute due date (monthly step)
      const dueDate = new Date(params.firstEmiDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const installment = await tx.expenseEmiInstallment.create({
        data: {
          emiScheduleId: emiSchedule.id,
          installmentNumber: i,
          dueDate,
          amountPaise: instAmount,
          status: 'UNPAID',
        },
      });

      // Split each installment across partners
      const instShares = splitPaiseDeterministically(instAmount, partnerSplits);

      for (const s of instShares) {
        await tx.partnerEmiObligation.create({
          data: {
            emiInstallmentId: installment.id,
            partnerId: s.partnerId,
            payableToPartnerId: params.paidByPartnerId,
            shareAmountPaise: s.amountPaise,
            remainingPaise: s.amountPaise,
            dueDate,
            status: 'UPCOMING',
          },
        });
      }

      installments.push(installment);
    }

    return { expense, emiSchedule, installments };
  };

  if (txClient) return await runner(txClient);
  return await prisma.$transaction(runner);
}

