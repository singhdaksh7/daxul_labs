import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { reorderBanners } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

const reorderSchema = z.object({
  bannerIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, reorderSchema);
  if (!p.ok) return p.response;

  try {
    await reorderBanners(p.data.bannerIds);
    await logAdminAction(g.admin, 'BANNERS_REORDERED', 'Banner', 'multiple', {
      count: p.data.bannerIds.length,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'POST /api/admin/banners/reorder');
  }
}
