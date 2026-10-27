import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { requireAdminSession, getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStorageService } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Access model (documented design):
 *  - Files registered as MediaAsset (admin media library: homepage/product/collection imagery)
 *    are PUBLIC: the storefront must render them for anonymous visitors. Names are 128-bit random hex.
 *  - Files registered as UploadedFile (customer artwork) are PRIVATE: readable only by the owning
 *    user or an admin. Guessing the name is not enough (401/404 otherwise).
 *  - Unregistered files are readable by admins only.
 */
/** Parse a single `bytes=a-b` range. Returns null when absent, 'invalid' when unsatisfiable. */
function parseRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
  let start: number;
  let end: number;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (!suffix) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return 'invalid';
  return { start, end };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeFilename = path.basename(filename);
    if (!/^[A-Za-z0-9._-]{1,200}$/.test(safeFilename)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { storageKey: safeFilename },
      select: { id: true },
    });

    if (!mediaAsset) {
      const adminAuth = await requireAdminSession();
      if (!adminAuth.authorized) {
        const userSession = await getAuthSession();
        const currentUserId = (userSession?.user as { id?: string } | undefined)?.id;
        if (!userSession?.user || !currentUserId) {
          return NextResponse.json({ error: 'Unauthorized: Access to customer artwork requires authentication' }, { status: 401 });
        }
        const fileRecord = await prisma.uploadedFile.findUnique({ where: { filename: safeFilename } });
        // Unknown file or someone else's file: indistinguishable 404 (no existence oracle).
        if (!fileRecord || !fileRecord.userId || fileRecord.userId !== currentUserId) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
      }
    }

    const stored = await getStorageService().getFile(safeFilename);
    if (!stored) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
    };
    const contentType = types[ext] || 'application/octet-stream';

    const total = stored.body.length;
    const range = parseRange(req.headers.get('range'), total);
    if (range === 'invalid') {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    }
    const body = range ? stored.body.subarray(range.start, range.end + 1) : stored.body;

    return new NextResponse(new Uint8Array(body), {
      status: range ? 206 : 200,
      headers: {
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${total}` } : {}),
        'Content-Length': String(body.length),
        'Content-Type': contentType,
        // Public media may be cached by browsers/CDN; private artwork never.
        'Cache-Control': mediaAsset ? 'public, max-age=3600' : 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch (err) {
    console.error('Upload read error:', err);
    return NextResponse.json({ error: 'Failed to serve file securely' }, { status: 500 });
  }
}
