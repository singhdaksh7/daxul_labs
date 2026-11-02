import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { rupeesToPaise, splitPaiseDeterministically } from './money';
import { recordPartnerLedgerEntry } from './ledger';
import { submitPartnerSettlement, verifyPartnerSettlement } from './settlements';
import { paiseToRupees } from './money';

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
  /** PARTNER_SPLIT (default) or REVENUE (cost recovered from business revenue; no partner obligations). */
  recoveryMode?: 'PARTNER_SPLIT' | 'REVENUE';
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
    const revenueMode = params.recoveryMode === 'REVENUE';
    const downPaymentShares = revenueMode ? [] : splitPaiseDeterministically(downPaymentPaise, partnerSplits);

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
        recoveryMode: revenueMode ? 'REVENUE' : 'PARTNER_SPLIT',
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
      const instShares = revenueMode ? [] : splitPaiseDeterministically(instAmount, partnerSplits);

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



export class EmiActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Marks an EMI installment as paid to the lender by the paying partner on `paidAt`.
 * Posts the ledger exactly like the down payment: payer is credited the full installment and every
 * partner is debited their share (EMI_SHARE_DUE). The payer's own share is settled to themselves
 * automatically; the other partners' shares become DUE and are tracked per partner.
 */
export async function markEmiInstallmentPaid(params: { installmentId: string; paidAt?: Date; createdBy: string }) {
  return await prisma.$transaction(async (tx) => {
    const inst = await tx.expenseEmiInstallment.findUnique({
      where: { id: params.installmentId },
      include: {
        partnerObligations: true,
        emiSchedule: { include: { expense: true } },
      },
    });
    if (!inst) throw new EmiActionError('Installment not found', 404);
    if (inst.status === 'PAID') throw new EmiActionError('This installment is already marked as paid');
    if (inst.status === 'CANCELLED' || inst.emiSchedule.expense.status === 'CANCELLED') {
      throw new EmiActionError('This EMI has been cancelled');
    }

    const expense = inst.emiSchedule.expense;
    const payerId = expense.paidByPartnerId;
    if (!payerId) throw new EmiActionError('This EMI has no paying partner', 400);

    const paidAt = params.paidAt ?? new Date();
    if (Number.isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new EmiActionError('Payment date cannot be in the future');
    }
    const label = `${expense.expenseNumber} EMI ${inst.installmentNumber}/${inst.emiSchedule.totalEmiCount}: ${expense.title}`;

    await tx.expenseEmiInstallment.update({
      where: { id: inst.id },
      data: { status: 'PAID', paidAt, amountPaidPaise: inst.amountPaise },
    });

    await recordPartnerLedgerEntry(
      {
        partnerId: payerId,
        type: 'EXPENSE_PAID',
        amountPaise: inst.amountPaise,
        direction: 'CREDIT',
        description: `Paid ${label}`,
        createdBy: params.createdBy,
        expenseId: expense.id,
        emiInstallmentId: inst.id,
      },
      tx,
    );

    for (const o of inst.partnerObligations) {
      await recordPartnerLedgerEntry(
        {
          partnerId: o.partnerId,
          type: 'EMI_SHARE_DUE',
          amountPaise: o.shareAmountPaise,
          direction: 'DEBIT',
          description: `Share of ${label}`,
          createdBy: params.createdBy,
          expenseId: expense.id,
          emiInstallmentId: inst.id,
        },
        tx,
      );
      const isPayer = o.partnerId === payerId;
      await tx.partnerEmiObligation.update({
        where: { id: o.id },
        data: isPayer
          ? { status: 'PAID', amountPaidPaise: o.shareAmountPaise, remainingPaise: BigInt(0) }
          : { status: o.dueDate.getTime() < Date.now() ? 'OVERDUE' : 'DUE' },
      });
    }
    return { installmentId: inst.id };
  });
}

/**
 * Records that a partner has paid their EMI share to the paying partner. It creates a settlement with an
 * allocation to this obligation and verifies it straight away (verified by the receiving partner), so the
 * ledger, the obligation status and the settlement history all stay consistent.
 */
export async function receiveEmiObligationPayment(params: {
  obligationId: string;
  amountRupees?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  actorUserId: string;
  actorRole: string;
}) {
  const obl = await prisma.partnerEmiObligation.findUnique({
    where: { id: params.obligationId },
    include: { emiInstallment: true },
  });
  if (!obl) throw new EmiActionError('Obligation not found', 404);
  if (!obl.payableToPartnerId) throw new EmiActionError('This obligation has no receiving partner');
  if (obl.partnerId === obl.payableToPartnerId) throw new EmiActionError('The paying partner does not owe themselves');
  if (obl.emiInstallment.status !== 'PAID') {
    throw new EmiActionError('Mark the installment as paid to the lender first, then record partner payments.');
  }
  if (obl.remainingPaise <= BigInt(0)) throw new EmiActionError('This share is already fully paid');

  const remainingRupees = paiseToRupees(obl.remainingPaise);
  const amountRupees = params.amountRupees ?? remainingRupees;
  if (!(amountRupees > 0) || amountRupees > remainingRupees + 0.001) {
    throw new EmiActionError(`Amount must be between 0.01 and the remaining ₹${remainingRupees}`);
  }

  const settlement = await submitPartnerSettlement({
    fromPartnerId: obl.partnerId,
    toPartnerId: obl.payableToPartnerId,
    amountRupees,
    paymentMethod: params.paymentMethod || 'UPI',
    referenceNumber: params.referenceNumber,
    notes: `EMI ${obl.emiInstallment.installmentNumber} share, recorded as received`,
    createdBy: params.actorUserId,
    allocations: [{ emiObligationId: obl.id, amountRupees }],
  });
  await verifyPartnerSettlement({
    settlementId: settlement.id,
    verifierPartnerId: obl.payableToPartnerId,
    verifierUserRole: params.actorRole,
  });
  return { settlementId: settlement.id };
}
