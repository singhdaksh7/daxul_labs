import { NextRequest, NextResponse } from 'next/server';
import { getGiftCardByCode } from '@/lib/retention/giftCards';
import { getRetentionSettings } from '@/lib/retention/settings';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const settings = await getRetentionSettings();
    if (!settings.giftCardsEnabled) {
      return NextResponse.json({ error: 'Gift cards are currently inactive' }, { status: 400 });
    }

    const card = await getGiftCardByCode(code);
    if (!card) {
      // Generic error prevents enumeration
      return NextResponse.json({ error: 'Invalid or inactive gift card' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      maskedCode: card.maskedCode,
      remainingBalance: card.remainingBalance,
      currency: card.currency,
      expiresAt: card.expiresAt,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to check gift card' }, { status: 500 });
  }
}

