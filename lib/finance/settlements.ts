import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { rupeesToPaise } from './money';
import { recordPartnerLedgerEntry } from './ledger';

export interface SubmitSettlementParams {
  fromPartnerId: string;
  toPartnerId: string;
  amountRupees: number;
  paymentMethod?: string;
  referenceNumber?: string;
  proofMediaUrl?: string;
  notes?: string;
  createdBy: string;
  // Specific obligations to pay against (optional, or auto-allocated)
  allocations?: Array<{
    expenseShareId?: string;
    emiObligationId?: string;
    amountRupees: number;
  }>;
}

/**
 * Creates a partner settlement with status PENDING_VERIFICATION.
 */
export async function submitPartnerSettlement(
  params: SubmitSettlementParams,
  txClient?: Prisma.TransactionClient,
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const count = await tx.partnerSettlement.count();
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const settlementNumber = `DXL-STL-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    const amountPaise = rupeesToPaise(params.amountRupees);

    return await tx.partnerSettlement.create({
      data: {
        settlementNumber,
        fromPartnerId: params.fromPartnerId,
        toPartnerId: params.toPartnerId,
        amountPaise,
        paymentMethod: params.paymentMethod || 'UPI',
        referenceNumber: params.referenceNumber,
        proofMediaUrl: params.proofMediaUrl,
        notes: params.notes,
        status: 'PENDING_VERIFICATION',
        createdBy: params.createdBy,
        allocations: params.allocations
          ? {
              create: params.allocations.map((a) => ({
                expenseShareId: a.expenseShareId,
                emiObligationId: a.emiObligationId,
                amountAllocatedPaise: rupeesToPaise(a.amountRupees),
              })),
            }
          : undefined,
      },
      include: {
        fromPartner: true,
        toPartner: true,
        allocations: true,
      },
    });
  };

  if (txClient) return await runner(txClient);
  return await prisma.$transaction(runner);
}

/**
 * Verifies and applies a settlement. Prevents conflict of interest (a partner cannot verify their own payment).
 * Updates partner obligations and writes corresponding ledger entries.
 */
export async function verifyPartnerSettlement(params: {
  settlementId: string;
  verifierPartnerId: string;
  verifierUserRole: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const settlement = await tx.partnerSettlement.findUnique({
      where: { id: params.settlementId },
      include: { allocations: true },
    });
    if (!settlement) throw new Error(`Settlement ${params.settlementId} not found`);

    if (settlement.status !== 'PENDING_VERIFICATION') {
      throw new Error(`Settlement is already ${settlement.status}`);
    }

    // Conflict of interest check: Payer cannot verify their own settlement unless super admin overriding
    if (settlement.fromPartnerId === params.verifierPartnerId && params.verifierUserRole !== 'SUPER_ADMIN') {
      throw new Error('Approval conflict: You cannot verify your own submitted payment');
    }

    // 1. Mark Settlement as VERIFIED
    const now = new Date();
    const verified = await tx.partnerSettlement.update({
      where: { id: settlement.id },
      data: {
        status: 'VERIFIED',
        verifiedBy: params.verifierPartnerId,
        verifiedAt: now,
      },
    });

    // 2. Ledger Impact:
    // Payer debt decreases (CREDIT payer)
    await recordPartnerLedgerEntry(
      {
        partnerId: settlement.fromPartnerId,
        type: 'PARTNER_SETTLEMENT',
        amountPaise: settlement.amountPaise,
        direction: 'CREDIT',
        description: `Settlement payment verified (${settlement.settlementNumber}) to partner`,
        createdBy: params.verifierPartnerId,
        settlementId: settlement.id,
      },
      tx,
    );

    // Receiver receivable collected (DEBIT receiver)
    await recordPartnerLedgerEntry(
      {
        partnerId: settlement.toPartnerId,
        type: 'PARTNER_SETTLEMENT',
        amountPaise: settlement.amountPaise,
        direction: 'DEBIT',
        description: `Settlement received and verified (${settlement.settlementNumber}) from partner`,
        createdBy: params.verifierPartnerId,
        settlementId: settlement.id,
      },
      tx,
    );

    // 3. Deduct from specific allocated obligations (or oldest outstanding)
    if (settlement.allocations.length > 0) {
      for (const alloc of settlement.allocations) {
        if (alloc.expenseShareId) {
          const share = await tx.partnerExpenseShare.findUnique({ where: { id: alloc.expenseShareId } });
          if (share) {
            const newPaid = share.paidAmountPaise + alloc.amountAllocatedPaise;
            const newRem = share.shareAmountPaise - newPaid;
            await tx.partnerExpenseShare.update({
              where: { id: share.id },
              data: {
                paidAmountPaise: newPaid,
                remainingPaise: newRem > BigInt(0) ? newRem : BigInt(0),
                status: newRem <= BigInt(0) ? 'PAID' : 'PARTIALLY_PAID',
              },
            });
          }
        }
        if (alloc.emiObligationId) {
          const obl = await tx.partnerEmiObligation.findUnique({ where: { id: alloc.emiObligationId } });
          if (obl) {
            const newPaid = obl.amountPaidPaise + alloc.amountAllocatedPaise;
            const newRem = obl.shareAmountPaise - newPaid;
            await tx.partnerEmiObligation.update({
              where: { id: obl.id },
              data: {
                amountPaidPaise: newPaid,
                remainingPaise: newRem > BigInt(0) ? newRem : BigInt(0),
                status: newRem <= BigInt(0) ? 'PAID' : 'PARTIALLY_PAID',
              },
            });
          }
        }
      }
    }

    return verified;
  });
}

