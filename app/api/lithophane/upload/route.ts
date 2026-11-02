import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStorageService, UploadValidationError } from '@/lib/storage';
import { clientIpFromHeaders } from '@/lib/loginLimiter';
import { LITHO_OWNER_COOKIE, hashOwnerToken, newOwnerToken } from '@/lib/lithophaneAccess';

export const dynamic = 'force-dynamic';

const MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

/**
 * POST /api/lithophane/upload (JPG/PNG/WEBP, 10MB). The photo is PRIVATE: no public URL is returned.
 * Logged-in users own it by userId; guests get an httpOnly owner cookie whose SHA-256 is stored.
 */
export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  if (rateLimited(ip)) return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
  const session = await getAuthSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  try {
    const declared = Number(req.headers.get('content-length') || 0);
    if (declared > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let result;
    try {
      result = await getStorageService().uploadFile(buffer, file.name, file.type, { allowedMimeTypes: MIME, maxSizeBytes: MAX_BYTES });
    } catch (err) {
      if (err instanceof UploadValidationError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }

    const existingCookie = req.cookies.get(LITHO_OWNER_COOKIE)?.value;
    const rawToken = existingCookie && /^[a-f0-9]{48}$/.test(existingCookie) ? existingCookie : newOwnerToken();
    const ownerToken = hashOwnerToken(rawToken);

    try {
      await prisma.uploadedFile.create({
        data: {
          filename: result.filename,
          originalName: result.originalName.slice(0, 200),
          mimeType: result.mimeType,
          size: result.size,
          provider: result.provider,
          path: result.filename,
          url: result.url,
          userId,
          ownerToken,
        },
      });
    } catch (dbErr) {
      await getStorageService().deleteFile(result.filename).catch(() => undefined);
      throw dbErr;
    }

    // Deliberately NOT returning result.url: customer photos have no public URL.
    const res = NextResponse.json({
      success: true,
      file: { filename: result.filename, mimeType: result.mimeType, size: result.size, originalName: result.originalName.slice(0, 200) },
    });
    if (existingCookie !== rawToken) {
      res.cookies.set(LITHO_OWNER_COOKIE, rawToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (err) {
    console.error('Lithophane upload error:', err);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
