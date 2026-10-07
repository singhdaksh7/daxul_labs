import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, serverError } from '@/lib/adminApi';
import {
  getAdminCmsSections,
  publishAllCmsSections,
  reorderCmsSections,
  resetAllCmsSectionsToDefault,
} from '@/lib/cmsService';

export const dynamic = 'force-dynamic';

const SECTION_KEYS = ['HEADER', 'HERO', 'FEATURED_PRODUCT', 'COLLECTIONS', 'CUSTOMIZATION', 'LAB', 'BUILDING_DAXUL', 'FOOTER'] as const;

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('publish_all') }),
  z.object({ action: z.literal('reset_all_default') }),
  z.object({ action: z.literal('reorder'), order: z.array(z.enum(SECTION_KEYS)).max(20) }),
]);

// Audit trail: every mutation below writes a CmsAuditLog row inside lib/cmsService.ts.

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const sections = await getAdminCmsSections();
    return NextResponse.json({ sections });
  } catch (err) {
    return serverError(err, 'GET /api/admin/cms/sections');
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const p = await parseBody(req, postSchema);
  if (!p.ok) return p.response;

  try {
    const adminEmail = g.admin.email;
    if (p.data.action === 'publish_all') {
      return NextResponse.json(await publishAllCmsSections(adminEmail));
    }
    if (p.data.action === 'reorder') {
      return NextResponse.json(await reorderCmsSections(p.data.order, adminEmail));
    }
    return NextResponse.json(await resetAllCmsSectionsToDefault(adminEmail));
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/sections');
  }
}
