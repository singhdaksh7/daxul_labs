import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStorageService } from '@/lib/storage';

export async function GET(req: Request) {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const searchQuery = searchParams.get('q');

    const where: any = {};
    if (typeFilter) where.type = typeFilter;
    if (searchQuery) {
      where.OR = [
        { filename: { contains: searchQuery, mode: 'insensitive' } },
        { altText: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list media assets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { authorized, session } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const altText = (formData.get('altText') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storageService = getStorageService();

    const uploadRes = await storageService.uploadFile(buffer, file.name, file.type);
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';

    const assetRecord = await prisma.mediaAsset.create({
      data: {
        type: mediaType,
        storageKey: uploadRes.filename,
        filename: uploadRes.filename,
        mimeType: uploadRes.mimeType,
        size: uploadRes.size,
        altText: altText || uploadRes.originalName,
      },
    });

    await prisma.cmsAuditLog.create({
      data: {
        adminEmail: session?.user?.email || 'admin@daxullabs.com',
        action: 'MEDIA_UPLOADED',
        details: { filename: assetRecord.filename, mimeType: assetRecord.mimeType },
      },
    });

    return NextResponse.json({
      asset: assetRecord,
      url: uploadRes.url,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Media upload failed' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { authorized, session } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('id');

    if (!assetId) {
      return NextResponse.json({ error: 'Missing media asset ID' }, { status: 400 });
    }

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    }

    await prisma.mediaAsset.delete({
      where: { id: assetId },
    });

    await prisma.cmsAuditLog.create({
      data: {
        adminEmail: session?.user?.email || 'admin@daxullabs.com',
        action: 'MEDIA_DELETED',
        details: { assetId, filename: asset.filename },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete media asset' }, { status: 500 });
  }
}
