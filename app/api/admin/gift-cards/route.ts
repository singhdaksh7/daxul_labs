import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { issueGiftCard } from '@/lib/retention/giftCards';
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

  const [totalAgg, activeCards, usedCards] = await Promise.all([
    prisma.giftCard.aggregate({
      _sum: { remainingBalance: true, originalAmount: true },
      _count: true,
    }),
    prisma.giftCard.count({ where: { status: 'ACTIVE' } }),
    prisma.giftCard.count({ where: { status: 'USED' } }),
  ]);

  const cards = await prisma.giftCard.findMany({
    where: q
      ? {
          OR: [
            { maskedCode: { contains: q, mode: 'insensitive' } },
            { recipientEmail: { contains: q, mode: 'insensitive' } },
            { recipientName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {},
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    enabled: settings.giftCardsEnabled,
    metrics: {
      totalCards: totalAgg._count,
      totalIssuedLiability: totalAgg._sum.originalAmount || 0,
      totalRemainingLiability: totalAgg._sum.remainingBalance || 0,
      activeCards,
      usedCards,
    },
    cards,
  });
}

const issueSchema = z.object({
  amount: z.number().positive(),
  recipientName: z.string().optional().nullable(),
  recipientEmail: z.string().email().optional().nullable(),
  personalMessage: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = check.session.user as { id?: string; email?: string };
  const json = await req.json();
  const parsed = issueSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const { card, rawCode } = await issueGiftCard({
      amount: parsed.data.amount,
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail,
      personalMessage: parsed.data.personalMessage,
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id || 'admin',
        adminUserEmail: admin.email || 'admin@daxullabs.com',
        action: 'GIFT_CARD_ISSUED',
        entityType: 'GiftCard',
        entityId: card.id,
        details: {
          amount: parsed.data.amount,
          recipientEmail: parsed.data.recipientEmail,
          maskedCode: card.maskedCode,
        },
      },
    });

    return NextResponse.json({
      success: true,
      card,
      rawCode, // Returned only once upon manual creation for admin dispatch
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to issue gift card' }, { status: 400 });
  }
}

