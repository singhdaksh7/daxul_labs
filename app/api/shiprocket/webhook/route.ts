import { NextRequest, NextResponse } from 'next/server';
import { handleShiprocketWebhook, verifyWebhookToken } from '@/lib/shiprocket/webhook';
import { getShiprocketWebhookToken } from '@/lib/shiprocket/client';
import { ensureShiprocketSettings } from '@/lib/shiprocket/settings';

export const dynamic = 'force-dynamic';

/**
 * Shiprocket tracking webhook. Configure in Shiprocket > Settings > API > Webhooks with header
 * `x-api-key: <SHIPROCKET_WEBHOOK_TOKEN>`. Rejected outright when the token env var is unset.
 */
export async function POST(req: NextRequest) {
  await ensureShiprocketSettings();
  const expected = getShiprocketWebhookToken();
  if (!expected) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  if (!verifyWebhookToken(req.headers.get('x-api-key'), expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  try {
    const result = await handleShiprocketWebhook(body);
    if (result === 'invalid') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    // 200 for unknown AWB / duplicates so Shiprocket does not retry endlessly.
    return NextResponse.json({ status: 'ok', result });
  } catch (err) {
    console.error('Shiprocket webhook error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

// Shiprocket sends a GET/HEAD ping when saving a webhook in some dashboards.
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
