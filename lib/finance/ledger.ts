import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface CreateLedgerEntryParams {
  partnerId: string;
  type:
    | 'CAPITAL_CONTRIBUTION'
    | 'EXPENSE_PAID'
    | 'EXPENSE_SHARE_DUE'
    | 'EMI_SHARE_DUE'
    | 'REIMBURSEMENT'
    | 'PARTNER_SETTLEMENT'
    | 'PROFIT_ALLOCATION'
    | 'PROFIT_WITHDRAWAL'
    | 'PARTNER_ADVANCE'
    | 'ADVANCE_REPAYMENT'
    | 'REFUND_ADJUSTMENT'
    | 'MANUAL_ADJUSTMENT'
    | 'REVENUE_RECOVERY'
    | 'REVERSAL';
  amountPaise: bigint;
  direction: 'DEBIT' | 'CREDIT';
  description: string;
  createdBy: string;
  expenseId?: string;
  emiInstallmentId?: string;
  orderId?: string;
  settlementId?: string;
  metadata?: Record<string, any>;
}

/**
 * Appends an immutable PartnerLedgerEntry and atomically updates the PartnerFinancialAccount.
 * CREDIT = Partner is owed money (receivable / capital / reimbursement)
 * DEBIT = Partner owes money (obligation / expense share / withdrawal)
 */
export async function recordPartnerLedgerEntry(
  params: CreateLedgerEntryParams,
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const account = await txClient.partnerFinancialAccount.findUnique({
    where: { partnerId: params.partnerId },
  });
  if (!account) {
    throw new Error(`PartnerFinancialAccount not found for partner ${params.partnerId}`);
  }

  // Calculate new net settlement position
  // Credit increases receivable/net position; Debit decreases it
  const currentNet = account.netSettlementPositionPaise;
  const delta = params.direction === 'CREDIT' ? params.amountPaise : -params.amountPaise;
  const newNet = currentNet + delta;

  // Insert immutable ledger entry
  const entry = await txClient.partnerLedgerEntry.create({
    data: {
      partnerId: params.partnerId,
      type: params.type,
      amountPaise: params.amountPaise,
      direction: params.direction,
      balanceAfterPaise: newNet,
      description: params.description,
      createdBy: params.createdBy,
      expenseId: params.expenseId,
      emiInstallmentId: params.emiInstallmentId,
      orderId: params.orderId,
      settlementId: params.settlementId,
      metadata: params.metadata || {},
    },
  });

  // Update specific financial account accumulator fields transactionally
  const updateData: Prisma.PartnerFinancialAccountUpdateInput = {
    netSettlementPositionPaise: newNet,
  };

  switch (params.type) {
    case 'CAPITAL_CONTRIBUTION':
      updateData.capitalContributedPaise = { increment: params.amountPaise };
      break;
    case 'EXPENSE_PAID':
      updateData.expensePaidPersonallyPaise = { increment: params.amountPaise };
      updateData.amountReceivablePaise = { increment: params.amountPaise };
      break;
    case 'EXPENSE_SHARE_DUE':
    case 'EMI_SHARE_DUE':
      updateData.amountPayablePaise = { increment: params.amountPaise };
      break;
    case 'PARTNER_SETTLEMENT':
      if (params.direction === 'CREDIT') {
        // Payer's debt reduced
        updateData.amountPayablePaise = { decrement: params.amountPaise };
      } else {
        // Receiver's receivable collected
        updateData.amountReceivablePaise = { decrement: params.amountPaise };
      }
      break;
    case 'PROFIT_ALLOCATION':
      updateData.profitAllocatedPaise = { increment: params.amountPaise };
      break;
    case 'PROFIT_WITHDRAWAL':
      updateData.profitWithdrawnPaise = { increment: params.amountPaise };
      break;
    case 'REVENUE_RECOVERY':
      // Business repaid the paying partner out of revenue: their receivable shrinks.
      updateData.amountReceivablePaise = { decrement: params.amountPaise };
      break;
    case 'REIMBURSEMENT':
      updateData.reimbursementDuePaise = { increment: params.amountPaise };
      break;
  }

  await txClient.partnerFinancialAccount.update({
    where: { partnerId: params.partnerId },
    data: updateData,
  });

  return entry;
}

