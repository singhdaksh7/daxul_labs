import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRESET_SEGMENTS, getSegmentCustomerCount, type SegmentRule } from '@/lib/retention/segments';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let dbSegments = await prisma.customerSegment.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Seed preset behavioral segments if table is empty
  if (dbSegments.length === 0) {
    for (const preset of PRESET_SEGMENTS) {
      await prisma.customerSegment.create({
        data: {
          name: preset.name,
          slug: preset.slug,
          description: preset.description,
          rules: preset.rules as any,
          isActive: true,
        },
      });
    }
    dbSegments = await prisma.customerSegment.findMany({ orderBy: { createdAt: 'asc' } });
  }

  // Calculate live matching count for active segments
  const segmentsWithCounts = await Promise.all(
    dbSegments.map(async (seg) => {
      const count = await getSegmentCustomerCount(seg.rules as any);
      return {
        ...seg,
        matchingCustomerCount: count,
      };
    }),
  );

  return NextResponse.json({
    segments: segmentsWithCounts,
  });
}

const createSegmentSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  rules: z.array(
    z.object({
      field: z.enum(['orderCount', 'totalSpend', 'averageOrderValue', 'daysSinceLastOrder', 'customProductBuyer']),
      operator: z.enum(['gte', 'lte', 'eq', 'isTrue']),
      value: z.union([z.number(), z.boolean()]),
    }),
  ),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = createSegmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const segment = await prisma.customerSegment.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: parsed.data.description,
        rules: parsed.data.rules,
        isActive: true,
      },
    });
    return NextResponse.json({ segment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create segment' }, { status: 400 });
  }
}

