import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { CmsSectionKey } from '@/lib/cmsTypes';
import {
  updateCmsDraft,
  publishCmsSection,
  revertCmsDraft,
  resetCmsSectionToDefault,
  toggleCmsSectionVisibility,
} from '@/lib/cmsService';
import { prisma } from '@/lib/db';

export async function GET(req: Request, props: { params: Promise<{ key: string }> }) {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const { key } = await props.params;
  try {
    const section = await prisma.homepageSection.findUnique({
      where: { sectionKey: key },
    });

    if (!section) {
      return NextResponse.json({ error: `Section ${key} not found` }, { status: 404 });
    }

    return NextResponse.json({ section });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch section' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ key: string }> }) {
  const { authorized, session } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const { key } = await props.params;
  try {
    const body = await req.json();
    const adminEmail = session?.user?.email || 'admin@daxullabs.com';

    if (!body.draftContent) {
      return NextResponse.json({ error: 'Missing draftContent payload' }, { status: 400 });
    }

    const updated = await updateCmsDraft(key as CmsSectionKey, body.draftContent, adminEmail);
    return NextResponse.json({ section: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update draft section' }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ key: string }> }) {
  const { authorized, session } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const { key } = await props.params;
  try {
    const body = await req.json();
    const adminEmail = session?.user?.email || 'admin@daxullabs.com';
    const sectionKey = key as CmsSectionKey;

    if (body.action === 'publish') {
      const updated = await publishCmsSection(sectionKey, adminEmail);
      return NextResponse.json({ section: updated });
    }

    if (body.action === 'revert') {
      const updated = await revertCmsDraft(sectionKey, adminEmail);
      return NextResponse.json({ section: updated });
    }

    if (body.action === 'reset_default') {
      const updated = await resetCmsSectionToDefault(sectionKey, adminEmail);
      return NextResponse.json({ section: updated });
    }

    if (body.action === 'toggle_visibility') {
      const updated = await toggleCmsSectionVisibility(sectionKey, adminEmail);
      return NextResponse.json({ section: updated });
    }

    return NextResponse.json({ error: 'Invalid section action parameter' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to execute section action' }, { status: 500 });
  }
}
