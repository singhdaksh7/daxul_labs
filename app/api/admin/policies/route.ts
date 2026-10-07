import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { POLICY_SLUGS, getPoliciesSeeded } from '@/lib/storePolicies';
import { POLICY_MAX_LENGTH, sanitizeMarkdown } from '@/lib/safeMarkdown';

export const dynamic = 'force-dynamic';

const putSchema = z.object({
  slug: z.enum(POLICY_SLUGS),
  title: z.string().trim().min(1).max(160),
  content: z.string().max(POLICY_MAX_LENGTH),
});

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const policies = await getPoliciesSeeded();
    return NextResponse.json({ policies, maxLength: POLICY_MAX_LENGTH });
  } catch (err) {
    return serverError(err, 'GET /api/admin/policies');
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const p = await parseBody(req, putSchema);
  if (!p.ok) return p.response;

  try {
    const { clean, changed } = sanitizeMarkdown(p.data.content);
    const title = sanitizeMarkdown(p.data.title).clean.trim() || p.data.slug;
    const before = await prisma.storePolicy.findUnique({ where: { slug: p.data.slug } });
    const policy = await prisma.storePolicy.upsert({
      where: { slug: p.data.slug },
      update: { title, content: clean },
      create: { slug: p.data.slug, title, content: clean },
    });
    await logAdminAction(g.admin, 'POLICY_UPDATED', 'StorePolicy', p.data.slug, {
      titleChanged: before?.title !== title,
      contentChanged: before?.content !== clean,
      previousLength: before?.content.length ?? 0,
      newLength: clean.length,
      htmlStripped: changed,
    });
    return NextResponse.json({ policy, htmlStripped: changed });
  } catch (err) {
    return serverError(err, 'PUT /api/admin/policies');
  }
}
