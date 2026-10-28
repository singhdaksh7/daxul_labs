import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get('status');
    const orderId = sp.get('orderId');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (orderId) {
      where.orderId = orderId;
    }

    const tickets = await prisma.productionJobTicket.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            status: true,
            createdAt: true,
          },
        },
        orderItem: {
          select: {
            productName: true,
            productImage: true,
            quantity: true,
            selectedFinish: true,
            selectedColor: true,
            selectedSize: true,
            customizations: true,
          },
        },
        printer: {
          select: {
            id: true,
            name: true,
            model: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, tickets });
  } catch (err) {
    return serverError(err, 'Admin GET Production Tickets Error:');
  }
}

const updateTicketSchema = z.object({
  ticketId: z.string().min(1),
  status: z
    .enum(['QUEUED', 'PRINTING', 'FAILED', 'REPRINT', 'FINISHING', 'QC', 'DONE'])
    .optional(),
  printerId: z.string().nullable().optional(),
  operator: z.string().trim().max(100).optional(),
  actualGrams: z.number().min(0).optional(),
  actualDurationMinutes: z.number().int().min(0).optional(),
  failureReason: z.string().trim().max(500).optional(),
  qcChecklist: z.union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown())]).optional(),
  qcNotes: z.string().trim().max(1000).optional(),
});

export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const parsed = await parseBody(req, updateTicketSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const ticket = await prisma.productionJobTicket.findUnique({
      where: { id: body.ticketId },
      include: { order: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Job ticket not found' }, { status: 404 });
    }

    const data: any = {};
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'PRINTING' && !ticket.startTime) {
        data.startTime = new Date();
      } else if (body.status === 'DONE' && !ticket.endTime) {
        data.endTime = new Date();
      }
    }
    if (body.printerId !== undefined) data.printerId = body.printerId;
    if (body.operator !== undefined) data.operator = body.operator;
    if (body.actualGrams !== undefined) data.actualGrams = body.actualGrams;
    if (body.actualDurationMinutes !== undefined) data.actualDurationMinutes = body.actualDurationMinutes;
    if (body.failureReason !== undefined) data.failureReason = body.failureReason;
    if (body.qcChecklist !== undefined) data.qcChecklist = body.qcChecklist;
    if (body.qcNotes !== undefined) data.qcNotes = body.qcNotes;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.productionJobTicket.update({
        where: { id: ticket.id },
        data,
      });

      // If printer assigned and status is PRINTING, update printer status
      if (data.printerId && data.status === 'PRINTING') {
        await tx.printer.update({
          where: { id: data.printerId },
          data: { status: 'PRINTING' },
        });
      } else if (ticket.printerId && (data.status === 'DONE' || data.status === 'FAILED')) {
        await tx.printer.update({
          where: { id: ticket.printerId },
          data: { status: 'AVAILABLE' },
        });
      }

      // If all tickets for an order are DONE, add an order status history note
      if (data.status === 'DONE') {
        const remaining = await tx.productionJobTicket.count({
          where: { orderId: ticket.orderId, status: { not: 'DONE' } },
        });
        if (remaining === 0) {
          await tx.orderStatusHistory.create({
            data: {
              orderId: ticket.orderId,
              status: ticket.order.status,
              note: 'All production job tickets completed and QC passed.',
            },
          });
        }
      }

      return res;
    });

    await logAdminAction(g.admin, 'PRODUCTION_TICKET_UPDATE', 'ProductionJobTicket', ticket.id, {
      ticketNumber: ticket.ticketNumber,
      updates: data,
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err) {
    return serverError(err, 'Admin PATCH Production Ticket Error:');
  }
}
