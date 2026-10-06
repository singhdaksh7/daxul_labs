import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify database connectivity silently
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: 'ok' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    // Never expose stack trace or database connection details to unauthenticated callers
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    );
  }
}
