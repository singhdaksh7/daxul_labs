import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/operations/rbac';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only users with users.manage permission or SUPER_ADMIN can inspect staff list
  if (!hasPermission(check.session.user as any, 'users.manage')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient staff permissions' }, { status: 403 });
  }

  const staff = await prisma.user.findMany({
    where: {
      OR: [
        { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        { staffRole: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffRole: true,
      permissions: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ staff });
}

const updateStaffRoleSchema = z.object({
  userId: z.string().min(1),
  staffRole: z.enum(['SUPER_ADMIN', 'OPERATIONS', 'PRODUCTION', 'QC', 'PACKING', 'SUPPORT', 'CONTENT', 'ANALYTICS']),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SUPER ADMIN protection: Only SUPER_ADMIN can change permissions/roles
  if (check.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only SUPER_ADMIN can modify staff roles and permissions' }, { status: 403 });
  }

  const json = await req.json();
  const parsed = updateStaffRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      staffRole: parsed.data.staffRole,
      permissions: parsed.data.permissions || [],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffRole: true,
      permissions: true,
    },
  });

  return NextResponse.json({ success: true, user: updated });
}

