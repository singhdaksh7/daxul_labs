import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashArSessionToken, isArSessionExpired } from '@/lib/lithophaneAr';
import { memoryArSessions } from '../route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid AR session token' }, { status: 400 });
  }

  const tokenHash = hashArSessionToken(token);

  // Check memory store first, then database
  let session = memoryArSessions.get(tokenHash);

  if (!session) {
    try {
      const dbRow = await prisma.lithophaneArSession.findUnique({
        where: { tokenHash },
      });
      if (dbRow) {
        session = {
          generationId: dbRow.generationId,
          hash: '',
          tokenHash: dbRow.tokenHash,
          deviceInfo: dbRow.deviceInfo || undefined,
          expiresAt: dbRow.expiresAt,
          createdAt: dbRow.createdAt,
        };
      }
    } catch {
      // ignore db error
    }
  }

  if (!session) {
    return NextResponse.json({ error: 'AR session not found or link is invalid' }, { status: 404 });
  }

  if (isArSessionExpired(session.expiresAt)) {
    return NextResponse.json(
      { error: 'This AR session has expired. Please open the Lithophane Builder to view a new preview.' },
      { status: 410 }
    );
  }

  // Attempt to enrich with generation config if available
  let config = session.configSummary ?? null;
  try {
    const gen = await prisma.lithophaneGeneration.findUnique({
      where: { id: session.generationId },
    });
    if (gen && gen.config) {
      config = { ...(config && typeof config === 'object' ? config : {}), ...(gen.config as Record<string, unknown>) };
    }
  } catch {
    // ignore
  }

  return NextResponse.json(
    {
      success: true,
      valid: true,
      generationId: session.generationId,
      expiresAt: session.expiresAt.toISOString(),
      config,
      modelUrl: `/api/lithophane/ar/model/${token}`,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    }
  );
}

