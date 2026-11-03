import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import {
  AR_SESSION_TTL_MS,
  generateArSessionToken,
  hashArSessionToken,
} from '@/lib/lithophaneAr';
import { saveArModel } from '@/lib/lithophaneArStorage';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  generationId: z.string().min(1).max(128),
  hash: z.string().min(1).max(128),
  configSummary: z
    .object({
      varietyName: z.string().optional(),
      sizeName: z.string().optional(),
      widthMm: z.number().optional(),
      heightMm: z.number().optional(),
      depthMm: z.number().nullable().optional(),
      unitPrice: z.number().optional(),
      lightOn: z.boolean().optional(),
    })
    .optional(),
  deviceInfo: z.string().max(200).optional(),
  glbBase64: z.string().optional(),
});

// Ephemeral fallback memory store for sessions (works when DB is offline / in testing)
export const memoryArSessions = new Map<
  string,
  {
    generationId: string;
    hash: string;
    tokenHash: string;
    configSummary?: unknown;
    deviceInfo?: string;
    expiresAt: Date;
    createdAt: Date;
  }
>();

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid AR session request', details: parsed.error.issues }, { status: 400 });
  }

  const { generationId, hash, configSummary, deviceInfo, glbBase64 } = parsed.data;

  const token = generateArSessionToken();
  const tokenHash = hashArSessionToken(token);
  const expiresAt = new Date(Date.now() + AR_SESSION_TTL_MS);

  // If client provided pre-generated GLB for handoff, store it securely
  let modelPath: string | null = null;
  if (glbBase64) {
    try {
      const buffer = Buffer.from(glbBase64, 'base64');
      modelPath = saveArModel(tokenHash, buffer);
    } catch {
      // non-fatal
    }
  }

  // Construct absolute or relative AR URL
  const origin = req.nextUrl.origin || 'http://localhost:3000';
  const arPath = `/ar/lithophane/${token}`;
  const absoluteArUrl = `${origin}${arPath}`;

  // Generate QR code
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(absoluteArUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('QR generation error:', err);
  }

  // Persist session to DB and memory store
  memoryArSessions.set(tokenHash, {
    generationId,
    hash,
    tokenHash,
    configSummary,
    deviceInfo,
    expiresAt,
    createdAt: new Date(),
  });

  try {
    await prisma.lithophaneArSession.create({
      data: {
        generationId,
        tokenHash,
        deviceInfo,
        modelPath,
        expiresAt,
      },
    });
  } catch {
    // If DB is offline in local dev or unit tests, memoryArSessions will serve the session
  }

  return NextResponse.json(
    {
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      url: arPath,
      absoluteUrl: absoluteArUrl,
      qrCodeDataUrl,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

