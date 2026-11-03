import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => ({}));
    // Telemetry logged server-side in privacy-safe manner (no camera data)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AR Telemetry]', data?.event, data);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

