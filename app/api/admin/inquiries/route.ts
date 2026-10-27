import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const updateInquirySchema = z.object({
  id: z.string().min(1),
  status: z.enum(['NEW', 'READ', 'RESPONDED', 'ARCHIVED']),
});

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const where = status ? { status } : {};

    const inquiries = await prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ inquiries });
  } catch (err) {
    return serverError(err, 'GET /api/admin/inquiries');
  }
}

export async function PATCH(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, updateInquirySchema);
  if (!p.ok) return p.response;

  try {
    const inquiry = await prisma.contactInquiry.update({
      where: { id: p.data.id },
      data: { status: p.data.status },
    });

    await logAdminAction(g.admin, 'INQUIRY_STATUS_UPDATED', 'ContactInquiry', inquiry.id, {
      status: inquiry.status,
    });

    return NextResponse.json({ inquiry });
  } catch (err) {
    return serverError(err, 'PATCH /api/admin/inquiries');
  }
}

export async function DELETE(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing inquiry ID' }, { status: 400 });
    }

    await prisma.contactInquiry.delete({ where: { id } });
    await logAdminAction(g.admin, 'INQUIRY_DELETED', 'ContactInquiry', id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'DELETE /api/admin/inquiries');
  }
}
