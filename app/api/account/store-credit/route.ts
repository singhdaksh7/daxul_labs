import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateStoreCreditAccount } from '@/lib/retention/storeCredit';
import { getRetentionSettings } from '@/lib/retention/settings';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [settings, account] = await Promise.all([
    getRetentionSettings(),
    getOrCreateStoreCreditAccount(user.id),
  ]);

  const transactions = await prisma.storeCreditTransaction.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    enabled: settings.storeCreditEnabled,
    account: {
      availableBalance: account.availableBalance,
      lifetimeCredited: account.lifetimeCredited,
      lifetimeDebited: account.lifetimeDebited,
    },
    transactions,
  });
}

