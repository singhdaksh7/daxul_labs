import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

// DAXUL default palette: Carbon, Bone, Graphite, Gray, Electric Lime.
const DAXUL_DEFAULT = {
  carbonColor: '#0B0B0C',
  backgroundColor: '#0B0B0C',
  boneColor: '#F3F0E9',
  graphiteColor: '#242426',
  secondaryTextColor: '#B9B9B4',
  accentColor: '#C8FF35',
  buttonColor: '#C8FF35',
  buttonRadius: 'md',
  borderRadius: 'md',
};

export async function POST() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const theme = await prisma.themeSettings.upsert({
      where: { id: 'default' },
      update: DAXUL_DEFAULT,
      create: { id: 'default', ...DAXUL_DEFAULT },
      select: {
        accentColor: true, carbonColor: true, boneColor: true, graphiteColor: true,
        buttonRadius: true, borderRadius: true, buttonColor: true, secondaryTextColor: true,
      },
    });
    await logAdminAction(g.admin, 'THEME_RESET', 'ThemeSettings', 'default', { restored: DAXUL_DEFAULT });
    return NextResponse.json({ theme });
  } catch (err) {
    return serverError(err, 'POST /api/admin/theme/reset');
  }
}
