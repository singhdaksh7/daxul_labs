import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashArSessionToken, isArSessionExpired } from '@/lib/lithophaneAr';
import { getArModel, saveArModel } from '@/lib/lithophaneArStorage';
import { memoryArSessions } from '../../session/route';

export const dynamic = 'force-dynamic';

async function verifyToken(token: string) {
  if (!token || token.length < 16) return null;
  const tokenHash = hashArSessionToken(token);

  let session = memoryArSessions.get(tokenHash);
  if (!session) {
    try {
      const dbRow = await prisma.lithophaneArSession.findUnique({ where: { tokenHash } });
      if (dbRow) {
        session = {
          generationId: dbRow.generationId,
          hash: '',
          tokenHash: dbRow.tokenHash,
          expiresAt: dbRow.expiresAt,
          createdAt: dbRow.createdAt,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!session) return { error: 'Session not found', status: 404 };
  if (isArSessionExpired(session.expiresAt)) {
    return { error: 'Session expired', status: 410 };
  }

  return { session, tokenHash };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = await verifyToken(token);
  if (!verified || 'error' in verified) {
    return NextResponse.json({ error: verified?.error || 'Unauthorized model access' }, { status: verified?.status || 401 });
  }

  const modelBuffer = getArModel(verified.tokenHash);
  if (!modelBuffer) {
    return NextResponse.json({ error: 'AR model asset not found for this session' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(modelBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Content-Disposition': 'inline; filename="lithophane-ar.glb"',
      'Content-Length': String(modelBuffer.byteLength),
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = await verifyToken(token);
  if (!verified || 'error' in verified) {
    return NextResponse.json({ error: verified?.error || 'Unauthorized' }, { status: verified?.status || 401 });
  }

  try {
    const arrayBuf = await req.arrayBuffer();
    if (!arrayBuf || arrayBuf.byteLength === 0) {
      return NextResponse.json({ error: 'Empty model payload' }, { status: 400 });
    }

    const filePath = saveArModel(verified.tokenHash, arrayBuf);
    try {
      await prisma.lithophaneArSession.update({
        where: { tokenHash: verified.tokenHash },
        data: { modelPath: filePath },
      });
    } catch {
      // ignore db error
    }

    return NextResponse.json({ success: true, size: arrayBuf.byteLength });
  } catch (err) {
    console.error('AR model upload error:', err);
    return NextResponse.json({ error: 'Could not store AR model' }, { status: 500 });
  }
}
