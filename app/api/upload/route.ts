import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStorageService } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Customer artwork uploads: raster images + PDF only, small size cap. No SVG/video.
const CUSTOMER_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const CUSTOMER_MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Authentication required: files are recorded against the uploading user and
  // can only be read back by that user (or an admin) via /api/uploads/file/[filename].
  const session = await getAuthSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session?.user || !userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

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
      if (/Invalid file type|prohibited|exceeds|signature|SECURITY/.test(err?.message || '')) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

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

    return NextResponse.json({
      success: true,
      file: { filename: result.filename, mimeType: result.mimeType, size: result.size, url: result.url },
    });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
