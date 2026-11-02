import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateTotpSecret, verifyTotpCode } from '@/lib/operations/twoFactor';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized || !check.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (check.session.user as any).id },
    select: { twoFactorEnabled: true, email: true },
  });

  return NextResponse.json({
    twoFactorEnabled: user?.twoFactorEnabled ?? false,
    email: user?.email,
  });
}

/**
 * Initiates TOTP setup by generating a secret
 */
export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized || !check.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUser = check.session.user as any;
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { twoFactorSecret: secret },
  });

  const otpAuthUrl = `otpauth://totp/DAXUL%20Labs:${sessionUser.email}?secret=${secret}&issuer=DAXUL%20Labs`;

  return NextResponse.json({
    secret,
    otpAuthUrl,
  });
}

const verifySchema = z.object({
  code: z.string().length(6),
});

/**
 * Verifies code and enables 2FA
 */
export async function PUT(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized || !check.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUser = check.session.user as any;
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ error: '2FA setup not initiated' }, { status: 400 });
  }

  const json = await req.json();
  const parsed = verifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid 6-digit verification code' }, { status: 400 });
  }

  const isValid = verifyTotpCode(user.twoFactorSecret, parsed.data.code);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid 2FA authentication code' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });

  return NextResponse.json({ success: true, message: 'Two-factor authentication enabled successfully' });
}

