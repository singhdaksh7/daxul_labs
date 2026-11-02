import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface ConfigurePartnerParams {
  userId: string;
  displayName: string;
  email: string;
  phone?: string | null;
  ownershipPercentage: number;
  expenseSplitPercentage: number;
  profitSplitPercentage: number;
  isPrimarySettlementPartner?: boolean;
  notes?: string | null;
}

/**
 * Onboards an EXISTING authenticated User as a BusinessPartner.
 * Strictly verifies the User exists. Never creates dummy users or accounts.
 */
export async function configureBusinessPartner(
  params: ConfigurePartnerParams,
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const user = await txClient.user.findUnique({
    where: { id: params.userId },
  });
  if (!user) {
    throw new Error(`User with ID ${params.userId} does not exist. A partner must link to an existing user.`);
  }

  // If this partner is set as primary settlement partner, unset any existing primary partner
  if (params.isPrimarySettlementPartner) {
    await txClient.businessPartner.updateMany({
      where: { isPrimarySettlementPartner: true },
      data: { isPrimarySettlementPartner: false },
    });
  }

  const partner = await txClient.businessPartner.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: params.displayName.trim(),
      email: user.email,
      phone: params.phone,
      ownershipPercentage: params.ownershipPercentage,
      expenseSplitPercentage: params.expenseSplitPercentage,
      profitSplitPercentage: params.profitSplitPercentage,
      isPrimarySettlementPartner: params.isPrimarySettlementPartner ?? false,
      notes: params.notes,
    },
    update: {
      displayName: params.displayName.trim(),
      phone: params.phone,
      ownershipPercentage: params.ownershipPercentage,
      expenseSplitPercentage: params.expenseSplitPercentage,
      profitSplitPercentage: params.profitSplitPercentage,
      isPrimarySettlementPartner: params.isPrimarySettlementPartner ?? false,
      notes: params.notes,
    },
    include: { financialAccount: true },
  });

  // Ensure PartnerFinancialAccount exists
  await txClient.partnerFinancialAccount.upsert({
    where: { partnerId: partner.id },
    create: { partnerId: partner.id },
    update: {},
  });

  return partner;
}

/**
 * Validates that total active partner split percentages equal exactly 100%.
 */
export async function validateActivePartnerSplits(txClient: Prisma.TransactionClient = prisma as any) {
  const partners = await txClient.businessPartner.findMany({
    where: { isActive: true },
  });

  if (partners.length === 0) return { valid: true, count: 0 };

  const totalExpenseSplit = partners.reduce((acc, p) => acc + p.expenseSplitPercentage, 0);
  const totalProfitSplit = partners.reduce((acc, p) => acc + p.profitSplitPercentage, 0);
  const totalOwnership = partners.reduce((acc, p) => acc + p.ownershipPercentage, 0);

  const isExact100 = (val: number) => Math.abs(val - 100) < 0.01;

  return {
    valid: isExact100(totalExpenseSplit) && isExact100(totalProfitSplit) && isExact100(totalOwnership),
    count: partners.length,
    totalExpenseSplit,
    totalProfitSplit,
    totalOwnership,
    partners,
  };
}

/**
 * Retrieves all business partners without auto-generating dummy records.
 */
export async function getActiveBusinessPartners(txClient: Prisma.TransactionClient = prisma as any) {
  return await txClient.businessPartner.findMany({
    where: { isActive: true },
    include: { financialAccount: true },
    orderBy: { createdAt: 'asc' },
  });
}
