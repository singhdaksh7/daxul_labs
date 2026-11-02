import { prisma } from '@/lib/db';

/**
 * Only a SUPER_ADMIN, or the partner who is paying the EMI (the one being repaid), may mark installments
 * paid or record that the other partners have repaid them.
 */
export async function canManageEmi(user: { id?: string; role?: string }, payerPartnerId: string | null): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true;
  if (!user.id || !payerPartnerId) return false;
  const partner = await prisma.businessPartner.findFirst({ where: { id: payerPartnerId, userId: user.id }, select: { id: true } });
  return !!partner;
}
