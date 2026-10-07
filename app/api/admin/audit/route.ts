import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, serverError } from '@/lib/adminApi';
import { redact } from '@/lib/auditRedact';

export const dynamic = 'force-dynamic';


const query = z.object({
  admin: z.string().trim().max(200).optional(),
  entityType: z.string().trim().max(80).optional(),
  action: z.string().trim().max(80).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

function parseDate(s: string | undefined, endOfDay: boolean): Date | undefined {
  if (!s) return undefined;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  const q = parsed.data;

  try {
    const from = parseDate(q.from, false);
    const to = parseDate(q.to, true);
    const range = from || to ? { ...(from && { gte: from }), ...(to && { lte: to }) } : undefined;

    const centralWhere = {
      ...(q.admin && { adminUserEmail: { contains: q.admin, mode: 'insensitive' as const } }),
      ...(q.entityType && { entityType: q.entityType }),
      ...(q.action && { action: { contains: q.action, mode: 'insensitive' as const } }),
      ...(range && { timestamp: range }),
    };
    // CmsAuditLog has no entity type column; its rows are all entityType "CmsSection".
    const includeCms = !q.entityType || q.entityType === 'CmsSection';
    const cmsWhere = {
      ...(q.admin && { adminEmail: { contains: q.admin, mode: 'insensitive' as const } }),
      ...(q.action && { action: { contains: q.action, mode: 'insensitive' as const } }),
      ...(range && { createdAt: range }),
    };

    const take = q.page * q.pageSize;
    const [central, cms, centralCount, cmsCount, entityTypes] = await Promise.all([
      prisma.auditLog.findMany({ where: centralWhere, orderBy: { timestamp: 'desc' }, take }),
      includeCms ? prisma.cmsAuditLog.findMany({ where: cmsWhere, orderBy: { createdAt: 'desc' }, take }) : Promise.resolve([]),
      prisma.auditLog.count({ where: centralWhere }),
      includeCms ? prisma.cmsAuditLog.count({ where: cmsWhere }) : Promise.resolve(0),
      prisma.auditLog.findMany({ distinct: ['entityType'], select: { entityType: true }, take: 100 }),
    ]);

    const merged = [
      ...central.map((r) => ({
        id: `a:${r.id}`,
        source: 'audit' as const,
        admin: r.adminUserEmail,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        timestamp: r.timestamp.toISOString(),
        details: redact(r.details ?? null),
      })),
      ...cms.map((r) => ({
        id: `c:${r.id}`,
        source: 'cms' as const,
        admin: r.adminEmail ?? 'unknown',
        action: r.action,
        entityType: 'CmsSection',
        entityId: r.sectionKey,
        timestamp: r.createdAt.toISOString(),
        details: redact(r.details ?? null),
      })),
    ]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
      .slice((q.page - 1) * q.pageSize, q.page * q.pageSize);

    const total = centralCount + cmsCount;
    return NextResponse.json({
      entries: merged,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      entityTypes: Array.from(new Set([...entityTypes.map((e) => e.entityType), 'CmsSection'])).sort(),
    });
  } catch (err) {
    return serverError(err, 'GET /api/admin/audit');
  }
}
