import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import {
  getAdminCmsSections,
  publishAllCmsSections,
  reorderCmsSections,
  resetAllCmsSectionsToDefault,
} from '@/lib/cmsService';

export async function GET() {
  const { authorized, session } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const sections = await getAdminCmsSections();
    return NextResponse.json({ sections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch CMS sections' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { authorized, session } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const adminEmail = session?.user?.email || 'admin@daxullabs.com';

    if (body.action === 'publish_all') {
      const result = await publishAllCmsSections(adminEmail);
      return NextResponse.json(result);
    }

    if (body.action === 'reorder') {
      if (!Array.isArray(body.order)) {
        return NextResponse.json({ error: 'Invalid section order array' }, { status: 400 });
      }
      const result = await reorderCmsSections(body.order, adminEmail);
      return NextResponse.json(result);
    }

    if (body.action === 'reset_all_default') {
      const result = await resetAllCmsSectionsToDefault(adminEmail);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process admin CMS action' }, { status: 500 });
  }
}
