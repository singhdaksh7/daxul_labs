import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, serverError } from '@/lib/adminApi';
import { CmsSectionKey } from '@/lib/cmsTypes';
import {
  updateCmsDraft,
  publishCmsSection,
  revertCmsDraft,
  resetCmsSectionToDefault,
  toggleCmsSectionVisibility,
} from '@/lib/cmsService';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SECTION_KEYS = ['HEADER', 'HERO', 'FEATURED_PRODUCT', 'COLLECTIONS', 'CUSTOMIZATION', 'LAB', 'BUILDING_DAXUL', 'FOOTER'];

const putSchema = z.object({ draftContent: z.record(z.string(), z.unknown()) });
const postSchema = z.object({ action: z.enum(['publish', 'revert', 'reset_default', 'toggle_visibility']) });

// Audit trail: every mutation below writes a CmsAuditLog row inside lib/cmsService.ts.

type Ctx = { params: Promise<{ key: string }> };

export async function GET(_req: Request, props: Ctx) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const { key } = await props.params;
  if (!SECTION_KEYS.includes(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 });
  try {
    const section = await prisma.homepageSection.findUnique({ where: { sectionKey: key } });
    if (!section) return NextResponse.json({ error: `Section ${key} not found` }, { status: 404 });
    return NextResponse.json({ section });
  } catch (err) {
    return serverError(err, 'GET /api/admin/cms/sections/[key]');
  }
}

export async function PUT(req: Request, props: Ctx) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const { key } = await props.params;
  if (!SECTION_KEYS.includes(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 });
  const p = await parseBody(req, putSchema);
  if (!p.ok) return p.response;

  try {
    const updated = await updateCmsDraft(key as CmsSectionKey, p.data.draftContent, g.admin.email);
    return NextResponse.json({ section: updated });
  } catch (err) {
    return serverError(err, 'PUT /api/admin/cms/sections/[key]');
  }
}

export async function POST(req: Request, props: Ctx) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const { key } = await props.params;
  if (!SECTION_KEYS.includes(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 });
  const p = await parseBody(req, postSchema);
  if (!p.ok) return p.response;

  try {
    const sectionKey = key as CmsSectionKey;
    const email = g.admin.email;
    const run = {
      publish: publishCmsSection,
      revert: revertCmsDraft,
      reset_default: resetCmsSectionToDefault,
      toggle_visibility: toggleCmsSectionVisibility,
    }[p.data.action];
    return NextResponse.json({ section: await run(sectionKey, email) });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/sections/[key]');
  }
}
