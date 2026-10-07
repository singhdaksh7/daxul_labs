import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getStorageService } from '@/lib/storage';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { findMediaUsages } from '@/lib/mediaUsage';

export const dynamic = 'force-dynamic';

// Admin media library: raster images + web video only (no SVG/PDF).
const ADMIN_MEDIA_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm'];
const MAX_BYTES = 50 * 1024 * 1024;

const patchSchema = z.object({ id: z.string().min(1).max(64), altText: z.string().trim().max(300) });

function withUrl<T extends { filename: string }>(a: T) {
  // Always the authenticated app route, never a raw bucket URL.
  return { ...a, url: `/api/uploads/file/${a.filename}` };
}

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const searchQuery = (searchParams.get('q') || '').slice(0, 100);

    const where: Record<string, unknown> = {};
    if (typeFilter === 'image' || typeFilter === 'video') where.type = typeFilter;
    if (searchQuery) {
      where.OR = [
        { filename: { contains: searchQuery, mode: 'insensitive' } },
        { altText: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ assets: assets.map(withUrl) });
  } catch (err) {
    return serverError(err, 'GET /api/admin/cms/media');
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
    const file = formData.get('file');
    const altRaw = formData.get('altText');
    const altText = (typeof altRaw === 'string' ? altRaw : '').trim().slice(0, 300);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 50MB limit' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let uploadRes;
    try {
      uploadRes = await getStorageService().uploadFile(buffer, file.name, file.type, {
        allowedMimeTypes: ADMIN_MEDIA_MIME,
        maxSizeBytes: MAX_BYTES,
      });
    } catch (err: any) {
      // Validation messages from the storage layer are safe, user-facing text.
      if (/Invalid file type|prohibited|exceeds|signature|SECURITY/.test(err?.message || '')) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        type: uploadRes.mimeType.startsWith('video/') ? 'video' : 'image',
        storageKey: uploadRes.filename,
        filename: uploadRes.filename,
        mimeType: uploadRes.mimeType,
        size: uploadRes.size,
        altText: altText || uploadRes.originalName.slice(0, 300),
      },
    });

    await logAdminAction(g.admin, 'MEDIA_UPLOADED', 'MediaAsset', asset.id, {
      filename: asset.filename,
      originalName: uploadRes.originalName,
      mimeType: asset.mimeType,
      size: asset.size,
    });

    return NextResponse.json({ asset: withUrl(asset), url: `/api/uploads/file/${asset.filename}` });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/media');
  }
}

export async function PATCH(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const p = await parseBody(req, patchSchema);
  if (!p.ok) return p.response;

  try {
    const existing = await prisma.mediaAsset.findUnique({ where: { id: p.data.id } });
    if (!existing) return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    const asset = await prisma.mediaAsset.update({ where: { id: p.data.id }, data: { altText: p.data.altText } });
    await logAdminAction(g.admin, 'MEDIA_ALT_UPDATED', 'MediaAsset', asset.id, {
      filename: asset.filename,
      from: existing.altText,
      to: asset.altText,
    });
    return NextResponse.json({ asset: withUrl(asset) });
  } catch (err) {
    return serverError(err, 'PATCH /api/admin/cms/media');
  }
}

export async function DELETE(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const assetId = new URL(req.url).searchParams.get('id');
    if (!assetId) return NextResponse.json({ error: 'Missing media asset ID' }, { status: 400 });

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });

    const usages = await findMediaUsages(asset.filename);
    if (usages.length > 0) {
      return NextResponse.json(
        { error: 'Media is in use and cannot be deleted. Remove it from the places below first.', usages },
        { status: 409 },
      );
    }

    await prisma.mediaAsset.delete({ where: { id: assetId } });
    await logAdminAction(g.admin, 'MEDIA_DELETED', 'MediaAsset', assetId, { filename: asset.filename, mimeType: asset.mimeType });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'DELETE /api/admin/cms/media');
  }
}
