import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { requireAdminSession, getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStorageService } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // 1. Sanitize filename to strictly prevent path traversal attacks
    const safeFilename = path.basename(filename);
    // 2. Authorization Check (Requirement 8)
    // Admin has access to all artwork; non-admin users must be authenticated and own the file
    const adminAuth = await requireAdminSession();
    if (!adminAuth.authorized) {
      const userSession = await getAuthSession();
      if (!userSession || !userSession.user) {
        return NextResponse.json({ error: 'Unauthorized: Access to customer artwork requires authentication' }, { status: 401 });
      }

      // Check DB record for file ownership
      const fileRecord = await prisma.uploadedFile.findUnique({
        where: { filename: safeFilename },
      });

      const currentUserId = (userSession.user as any).id;

      if (fileRecord && fileRecord.userId && fileRecord.userId !== currentUserId) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to access this file' }, { status: 403 });
      }
    }

    // 3. Read File and Determine Content Type
    const stored = await getStorageService().getFile(safeFilename);
    if (!stored) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const fileBuffer = stored.body;
    const ext = path.extname(safeFilename).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.pdf') contentType = 'application/pdf';

    // 4. Return secure headers (prevent SVG XSS execution)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline';",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to serve file securely' }, { status: 500 });
  }
}
