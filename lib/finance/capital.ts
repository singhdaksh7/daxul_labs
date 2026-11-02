import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { rupeesToPaise } from './money';
import { recordPartnerLedgerEntry } from './ledger';

export interface AddCapitalParams {
  partnerId: string;
  amountRupees: number;
  type?: 'CAPITAL_CONTRIBUTION' | 'PARTNER_ADVANCE';
  method?: string;
  reference?: string;
  notes?: string;
  createdBy: string;
}

/**
 * Records partner capital contribution or temporary partner advance to the business.
 * Does NOT conflate capital contribution with revenue or ownership percentage changes.
 */
export async function addPartnerCapital(
  params: AddCapitalParams,
  txClient?: Prisma.TransactionClient,
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const amountPaise = rupeesToPaise(params.amountRupees);
    const type = params.type || 'CAPITAL_CONTRIBUTION';

    const entry = await tx.partnerCapitalEntry.create({
      data: {
        partnerId: params.partnerId,
        type,
        amountPaise,
        method: params.method || 'BANK_TRANSFER',
        reference: params.reference,
        notes: params.notes,
        createdBy: params.createdBy,
      },
    });

    await recordPartnerLedgerEntry(
      {
        partnerId: params.partnerId,
        type: type === 'PARTNER_ADVANCE' ? 'PARTNER_ADVANCE' : 'CAPITAL_CONTRIBUTION',
        amountPaise,
        direction: 'CREDIT',
        description: `${type === 'PARTNER_ADVANCE' ? 'Temporary advance' : 'Capital contribution'} to DAXUL Labs: ${params.notes || ''}`,
        createdBy: params.createdBy,
      },
      tx,
    );

    return entry;
  };

  if (txClient) return await runner(txClient);
  return await prisma.$transaction(runner);
}

export interface PartnerWithdrawalParams {
  partnerId: string;
  amountRupees: number;
  type?: 'PROFIT_WITHDRAWAL' | 'CAPITAL_WITHDRAWAL' | 'REIMBURSEMENT' | 'ADVANCE_REPAYMENT';
  reason: string;
  proofUrl?: string;
  approvedBy?: string;
}

/**
 * Records partner withdrawal from allocated profit or capital.
 */
export async function recordPartnerWithdrawal(
  params: PartnerWithdrawalParams,
  txClient?: Prisma.TransactionClient,
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const amountPaise = rupeesToPaise(params.amountRupees);
    const type = params.type || 'PROFIT_WITHDRAWAL';

    const withdrawal = await tx.partnerWithdrawal.create({
      data: {
        partnerId: params.partnerId,
        type,
        amountPaise,
        reason: params.reason,
        proofUrl: params.proofUrl,
        approvedBy: params.approvedBy,
        status: 'COMPLETED',
      },
    });

    await recordPartnerLedgerEntry(
      {
        partnerId: params.partnerId,
        type: type === 'CAPITAL_WITHDRAWAL' ? 'MANUAL_ADJUSTMENT' : 'PROFIT_WITHDRAWAL',
        amountPaise,
        direction: 'DEBIT',
        description: `Partner withdrawal (${type}): ${params.reason}`,
        createdBy: params.approvedBy || 'admin',
      },
      tx,
    );

    return withdrawal;
  };

  if (txClient) return await runner(txClient);
  return await prisma.$transaction(runner);
}

