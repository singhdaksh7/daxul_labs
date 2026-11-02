import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface EnsurePartnersResult {
  daksh: any;
  partnerB: any;
  partnerC: any;
}

/**
 * Seeds or fetches the 3 official partners with exactly 33.333333% equal split.
 * Daksh is marked as isPrimarySettlementPartner = true.
 */
export async function getOrCreateDefaultPartners(txClient: Prisma.TransactionClient = prisma as any): Promise<EnsurePartnersResult> {
  // Find or create Daksh User
  let dakshUser = await txClient.user.findFirst({
    where: {
      OR: [
        { email: 'manavdaksh7@gmail.com' },
        { role: 'SUPER_ADMIN' },
      ],
    },
  });

  if (!dakshUser) {
    dakshUser = await txClient.user.create({
      data: {
        email: 'daksh@daxullabs.com',
        name: 'Daksh Singh',
        role: 'SUPER_ADMIN',
      },
    });
  }

  // Find or create Partner B User
  let partnerBUser = await txClient.user.findFirst({
    where: { email: 'partner.b@daxullabs.com' },
  });
  if (!partnerBUser) {
    partnerBUser = await txClient.user.create({
      data: {
        email: 'partner.b@daxullabs.com',
        name: 'Partner B',
        role: 'ADMIN',
      },
    });
  }

  // Find or create Partner C User
  let partnerCUser = await txClient.user.findFirst({
    where: { email: 'partner.c@daxullabs.com' },
  });
  if (!partnerCUser) {
    partnerCUser = await txClient.user.create({
      data: {
        email: 'partner.c@daxullabs.com',
        name: 'Partner C',
        role: 'ADMIN',
      },
    });
  }

  // Upsert BusinessPartner records
  const daksh = await txClient.businessPartner.upsert({
    where: { userId: dakshUser.id },
    create: {
      userId: dakshUser.id,
      displayName: 'Daksh',
      email: dakshUser.email,
      ownershipPercentage: 33.333334, // 1st partner gets the fractional micro-percentage for exact 100%
      expenseSplitPercentage: 33.333334,
      profitSplitPercentage: 33.333334,
      isPrimarySettlementPartner: true,
      notes: 'Founder & Primary Settlement / Collection Partner',
    },
    update: {
      isPrimarySettlementPartner: true,
    },
    include: { financialAccount: true },
  });

  const partnerB = await txClient.businessPartner.upsert({
    where: { userId: partnerBUser.id },
    create: {
      userId: partnerBUser.id,
      displayName: 'Partner B',
      email: partnerBUser.email,
      ownershipPercentage: 33.333333,
      expenseSplitPercentage: 33.333333,
      profitSplitPercentage: 33.333333,
      isPrimarySettlementPartner: false,
      notes: 'Operations & Co-founder',
    },
    update: {},
    include: { financialAccount: true },
  });

  const partnerC = await txClient.businessPartner.upsert({
    where: { userId: partnerCUser.id },
    create: {
      userId: partnerCUser.id,
      displayName: 'Partner C',
      email: partnerCUser.email,
      ownershipPercentage: 33.333333,
      expenseSplitPercentage: 33.333333,
      profitSplitPercentage: 33.333333,
      isPrimarySettlementPartner: false,
      notes: 'Supply Chain & Co-founder',
    },
    update: {},
    include: { financialAccount: true },
  });

  // Ensure each partner has a PartnerFinancialAccount initialized
  for (const p of [daksh, partnerB, partnerC]) {
    await txClient.partnerFinancialAccount.upsert({
      where: { partnerId: p.id },
      create: { partnerId: p.id },
      update: {},
    });
  }

  return { daksh, partnerB, partnerC };
}

