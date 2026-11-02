import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { creditStoreCredit } from '@/lib/retention/storeCredit';
import { getRetentionSettings } from '@/lib/retention/settings';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  const settings = await getRetentionSettings();

  const [totalAgg, accounts] = await Promise.all([
    prisma.storeCreditAccount.aggregate({
      _sum: { availableBalance: true, lifetimeCredited: true, lifetimeDebited: true },
      _count: true,
    }),
    prisma.storeCreditAccount.findMany({
      where: q
        ? {
            user: {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
              ],
            },
          }
        : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { availableBalance: 'desc' },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    enabled: settings.storeCreditEnabled,
    metrics: {
      totalLiability: totalAgg._sum.availableBalance || 0,
      totalCredited: totalAgg._sum.lifetimeCredited || 0,
      totalDebited: totalAgg._sum.lifetimeDebited || 0,
      accountsCount: totalAgg._count,
    },
    accounts,
  });
}

const creditSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = check.session.user as { id?: string; email?: string };
  const json = await req.json();
  const parsed = creditSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const tx = await creditStoreCredit({
      userId: parsed.data.userId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      adminUserId: admin.id || 'admin',
    });

    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id || 'admin',
        adminUserEmail: admin.email || 'admin@daxullabs.com',
        action: 'STORE_CREDIT_MANUAL_ISSUE',
        entityType: 'StoreCreditAccount',
        entityId: tx.accountId,
        details: {
          userId: parsed.data.userId,
          amount: parsed.data.amount,
          reason: parsed.data.reason,
          txId: tx.id,
        },
      },
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to issue store credit' }, { status: 400 });
  }
}

