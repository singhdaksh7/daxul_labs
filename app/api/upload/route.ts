import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storage = getStorageService();
    const result = await storage.uploadFile(buffer, file.name, file.type);

    return NextResponse.json({
      success: true,
      file: result,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
