import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/operations/rbac';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

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
  staffRole: z
    .enum(['SUPER_ADMIN', 'OPERATIONS', 'PRODUCTION', 'QC', 'PACKING', 'SUPPORT', 'CONTENT', 'ANALYTICS'])
    .nullable()
    .optional(),
  permissions: z.array(z.string()).optional(),
  // Account-level access: SUPER_ADMIN = everything (finance, staff, settings); ADMIN = admin panel
  // incl. finance, but cannot manage staff roles; CUSTOMER = revoke admin access.
  role: z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']).optional(),
});

const createStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('SUPER_ADMIN'),
  // Required only when the account does not exist yet. Share it with the partner privately.
  password: z.string().min(10).max(128).optional(),
});

async function audit(adminId: string | undefined, adminEmail: string, action: string, entityId: string, details: object) {
  try {
    await prisma.auditLog.create({
      data: { adminUserId: adminId ?? null, adminUserEmail: adminEmail, action, entityType: 'User', entityId, details },
    });
  } catch (e) {
    console.error('staff audit log failed', e);
  }
}

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (check.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only SUPER_ADMIN can add staff' }, { status: 403 });
  }
  const parsed = createStaffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, name, role, password } = parsed.data;
  const actor = check.session.user as { id?: string; email?: string };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const select = { id: true, name: true, email: true, role: true, staffRole: true } as const;
  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: { role, ...(role === 'SUPER_ADMIN' ? { staffRole: 'SUPER_ADMIN' } : {}) },
      select,
    });
  } else {
    if (!password) {
      return NextResponse.json({ error: 'No account exists for this email. Provide a temporary password (min 10 characters).' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: { email, name: name ?? email.split('@')[0], passwordHash, role, ...(role === 'SUPER_ADMIN' ? { staffRole: 'SUPER_ADMIN' } : {}) },
      select,
    });
  }
  await audit(actor.id, actor.email ?? 'unknown', existing ? 'STAFF_PROMOTED' : 'STAFF_CREATED', user.id, { email, role });
  return NextResponse.json({ success: true, created: !existing, user });
}

export async function PATCH(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SUPER ADMIN protection: Only SUPER_ADMIN can change permissions/roles
  if (check.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only SUPER_ADMIN can modify staff roles and permissions' }, { status: 403 });
  }

  const parsed = updateStaffRoleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { userId, staffRole, permissions, role } = parsed.data;
  const actor = check.session.user as { id?: string; email?: string };

  const found = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!found) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (role && role !== 'SUPER_ADMIN') {
    // Never lock the business out: no self-demotion and always keep one SUPER_ADMIN.
    if (userId === actor.id) {
      return NextResponse.json({ error: 'You cannot reduce your own access.' }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role === 'SUPER_ADMIN') {
      const supers = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (supers <= 1) {
        return NextResponse.json({ error: 'At least one SUPER_ADMIN must remain.' }, { status: 400 });
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(role ? { role } : {}),
      ...(staffRole !== undefined ? { staffRole } : {}),
      ...(permissions ? { permissions } : {}),
    },
    select: { id: true, name: true, email: true, role: true, staffRole: true, permissions: true },
  });
  await audit(actor.id, actor.email ?? 'unknown', 'STAFF_UPDATED', userId, { role, staffRole, permissions });
  return NextResponse.json({ success: true, user: updated });
}
