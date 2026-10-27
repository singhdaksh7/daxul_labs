import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import {
  getNavigationMenu,
  upsertNavigationMenu,
  addNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
} from '@/lib/cms/pageService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

export const dynamic = 'force-dynamic';

const addItemSchema = z.object({
  menuHandle: z.string().trim().min(1),
  parentId: z.string().nullable().optional(),
  label: z.string().trim().min(1).max(100),
  url: z.string().trim().min(1).max(500),
  pageId: z.string().nullable().optional(),
  openNewTab: z.boolean().optional(),
});

const updateItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().min(1).max(500).optional(),
  pageId: z.string().nullable().optional(),
  openNewTab: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    await ensureDefaultCmsData();
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle') || 'header';
    const menu = await getNavigationMenu(handle);
    return NextResponse.json({ menu });
  } catch (err) {
    return serverError(err, 'GET /api/admin/navigation');
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, addItemSchema);
  if (!p.ok) return p.response;

  try {
    let menu = await getNavigationMenu(p.data.menuHandle);
    if (!menu) {
      menu = (await upsertNavigationMenu(
        p.data.menuHandle,
        p.data.menuHandle === 'header'
          ? 'Header Navigation'
          : p.data.menuHandle === 'footer'
          ? 'Footer Navigation'
          : 'Mobile Navigation'
      )) as any;
    }

    const item = await addNavigationItem({
      menuId: menu!.id,
      parentId: p.data.parentId,
      label: p.data.label,
      url: p.data.url,
      pageId: p.data.pageId,
      openNewTab: p.data.openNewTab,
    });

    await logAdminAction(g.admin, 'NAVIGATION_ITEM_ADDED', 'NavigationItem', item.id, {
      menu: p.data.menuHandle,
      label: item.label,
      url: item.url,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return serverError(err, 'POST /api/admin/navigation');
  }
}

export async function PATCH(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, updateItemSchema);
  if (!p.ok) return p.response;

  try {
    const item = await updateNavigationItem(p.data.id, p.data);
    await logAdminAction(g.admin, 'NAVIGATION_ITEM_UPDATED', 'NavigationItem', item.id, {
      label: item.label,
      url: item.url,
      isActive: item.isActive,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return serverError(err, 'PATCH /api/admin/navigation');
  }
}

export async function DELETE(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    await deleteNavigationItem(id);
    await logAdminAction(g.admin, 'NAVIGATION_ITEM_DELETED', 'NavigationItem', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'DELETE /api/admin/navigation');
  }
}
