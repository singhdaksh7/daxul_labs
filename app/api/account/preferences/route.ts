import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const preferencesSchema = z.object({
  emailTransactional: z.boolean().default(true),
  emailMarketing: z.boolean().default(true),
  whatsappTransactional: z.boolean().default(true),
  whatsappMarketing: z.boolean().default(false),
  birthdayDay: z.number().int().min(1).max(31).nullable().optional(),
  birthdayMonth: z.number().int().min(1).max(12).nullable().optional(),
  anniversaryDay: z.number().int().min(1).max(31).nullable().optional(),
  anniversaryMonth: z.number().int().min(1).max(12).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { notificationPreferences: true },
  });

  const prefs = (user?.notificationPreferences as any) || {
    emailTransactional: true,
    emailMarketing: true,
    whatsappTransactional: true,
    whatsappMarketing: false,
    birthdayDay: null,
    birthdayMonth: null,
    anniversaryDay: null,
    anniversaryMonth: null,
  };

  return NextResponse.json({ preferences: prefs });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = preferencesSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { email: session.user.email.toLowerCase() },
    data: {
      notificationPreferences: parsed.data,
    },
    select: { notificationPreferences: true },
  });

  return NextResponse.json({
    success: true,
    preferences: updatedUser.notificationPreferences,
  });
}

