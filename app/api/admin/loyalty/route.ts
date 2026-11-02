import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminAdjustLoyaltyPoints } from '@/lib/retention/loyalty';
import { getRetentionSettings } from '@/lib/retention/settings';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  const [settings, totalAvailableAgg, totalRedeemedAgg, totalEarnedAgg] = await Promise.all([
    getRetentionSettings(),
    prisma.loyaltyAccount.aggregate({
      _sum: { availablePoints: true },
    }),
    prisma.loyaltyAccount.aggregate({
      _sum: { lifetimeRedeemed: true },
    }),
    prisma.loyaltyAccount.aggregate({
      _sum: { lifetimeEarned: true },
    }),
  ]);

  const userWhere = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const accounts = await prisma.loyaltyAccount.findMany({
    where: {
      user: userWhere,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { availablePoints: 'desc' },
    take: 50,
  });

  const recentTransactions = await prisma.loyaltyTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      account: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      order: { select: { id: true, orderNumber: true } },
    },
  });

  return NextResponse.json({
    metrics: {
      totalOutstandingPoints: totalAvailableAgg._sum.availablePoints || 0,
      totalEarnedPoints: totalEarnedAgg._sum.lifetimeEarned || 0,
      totalRedeemedPoints: totalRedeemedAgg._sum.lifetimeRedeemed || 0,
      enabled: settings.loyaltyEnabled,
    },
    settings,
    accounts,
    recentTransactions,
  });
}

const adjustSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['ADMIN_CREDIT', 'ADMIN_DEBIT']),
  points: z.number().int().positive(),
  reason: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = check.session.user as { id?: string; email?: string };
  const json = await req.json();
  const parsed = adjustSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const tx = await adminAdjustLoyaltyPoints({
      userId: parsed.data.userId,
      adminUserId: adminUser.id || 'admin',
      adminUserEmail: adminUser.email || 'admin@daxullabs.com',
      type: parsed.data.type,
      points: parsed.data.points,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ success: true, transaction: tx });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to adjust points' }, { status: 400 });
  }
}

