import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRetentionSettings, DEFAULT_RETENTION_SETTINGS } from '@/lib/retention/settings';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getRetentionSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = check.session.user as { id?: string; email?: string };
  const json = await req.json();

  const updated = await prisma.retentionSettings.upsert({
    where: { id: 'default' },
    create: {
      ...DEFAULT_RETENTION_SETTINGS,
      ...json,
      id: 'default',
    },
    update: {
      ...json,
    },
  });

  // Mandatory audit log for retention setting changes
  await prisma.auditLog.create({
    data: {
      adminUserId: admin.id || 'admin',
      adminUserEmail: admin.email || 'admin@daxullabs.com',
      action: 'RETENTION_SETTINGS_UPDATE',
      entityType: 'RetentionSettings',
      entityId: 'default',
      details: json,
    },
  });

  return NextResponse.json({ success: true, settings: updated });
}

