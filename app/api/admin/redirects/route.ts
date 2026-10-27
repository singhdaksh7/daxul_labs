import { NextResponse } from 'next/server';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';
import { listRedirects, deleteRedirect } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const redirects = await listRedirects();
    return NextResponse.json({ redirects });
  } catch (err) {
    return serverError(err, 'GET /api/admin/redirects');
  }
}

export async function DELETE(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing redirect ID' }, { status: 400 });
    }

    await deleteRedirect(id);
    await logAdminAction(g.admin, 'REDIRECT_DELETED', 'CmsRedirect', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'DELETE /api/admin/redirects');
  }
}
