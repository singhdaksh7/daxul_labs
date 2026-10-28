import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const printers = await prisma.printer.findMany({
      include: {
        tickets: {
          where: { status: 'PRINTING' },
          select: { id: true, ticketNumber: true, orderId: true, material: true, color: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, printers });
  } catch (err) {
    return serverError(err, 'Admin GET Printers Error:');
  }
}

const printerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  status: z.enum(['AVAILABLE', 'PRINTING', 'MAINTENANCE', 'OFFLINE']).default('AVAILABLE'),
  location: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const parsed = await parseBody(req, printerSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const printer = await prisma.printer.create({
      data: {
        name: body.name,
        model: body.model,
        status: body.status,
        location: body.location || null,
        notes: body.notes || null,
      },
    });

    await logAdminAction(g.admin, 'PRINTER_CREATED', 'Printer', printer.id, {
      name: printer.name,
      model: printer.model,
    });

    return NextResponse.json({ success: true, printer });
  } catch (err) {
    return serverError(err, 'Admin POST Printer Error:');
  }
}
