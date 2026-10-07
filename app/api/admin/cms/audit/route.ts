import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guardAdmin, serverError } from '@/lib/adminApi';
import { redact } from '@/lib/auditRedact';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const logs = await prisma.cmsAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ logs: logs.map((l) => ({ ...l, details: redact(l.details ?? null) })) });
  } catch (err) {
    return serverError(err, 'GET /api/admin/cms/audit');
  }
}
