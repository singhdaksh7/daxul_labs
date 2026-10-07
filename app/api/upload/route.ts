import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStorageService, UploadValidationError } from '@/lib/storage';
import { clientIpFromHeaders } from '@/lib/loginLimiter';

export const dynamic = 'force-dynamic';

// Customer artwork uploads: raster images + PDF only, small size cap. No SVG/video.
const CUSTOMER_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const CUSTOMER_MAX_BYTES = 10 * 1024 * 1024;

// Checkout is guest-only, so customization artwork uploads must work without an account.
// Guards: strict type allowlist, size cap, per-IP rate limit. Files are PRIVATE: they are readable
// only by an admin (or the owning user when logged in) via /api/uploads/file/[filename].
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 12;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_UPLOADS_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
  }
  const session = await getAuthSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  try {
    const declared = Number(req.headers.get('content-length') || 0);
    if (declared > CUSTOMER_MAX_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > CUSTOMER_MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let result;
    try {
      result = await getStorageService().uploadFile(buffer, file.name, file.type, {
        allowedMimeTypes: CUSTOMER_MIME,
        maxSizeBytes: CUSTOMER_MAX_BYTES,
      });
    } catch (err: any) {
      // Validation happens before anything is stored: no object, no DB row on failure.
      if (err instanceof UploadValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

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
        },
      });
    } catch (dbErr) {
      // Do not leave an orphaned object behind.
      await getStorageService().deleteFile(result.filename).catch(() => undefined);
      throw dbErr;
    }

    return NextResponse.json({
      success: true,
      file: { filename: result.filename, mimeType: result.mimeType, size: result.size, url: result.url },
    });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
