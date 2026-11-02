import { prisma } from '@/lib/db';
import { consumeFilament } from './materials';

export interface RecordFailureParams {
  jobTicketId: string;
  printerId?: string | null;
  spoolId?: string | null;
  failureReason: string;
  wastedGrams: number;
  wastedMinutes: number;
  photoUrl?: string | null;
  notes?: string | null;
  operatorId?: string;
}

/**
 * Records a print failure with exact waste metrics and updates spool balances.
 * Creates an immutable PrintFailure record linked to the job ticket.
 */
export async function recordPrintFailure(params: RecordFailureParams) {
  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.productionJobTicket.findUnique({
      where: { id: params.jobTicketId },
      include: { printer: true, spool: true },
    });
    if (!ticket) throw new Error(`Job ticket ${params.jobTicketId} not found`);

    const spoolId = params.spoolId || ticket.spoolId;
    let wasteCost = 0;

    if (spoolId && params.wastedGrams > 0) {
      const spool = await tx.filamentSpool.findUnique({ where: { id: spoolId } });
      if (spool) {
        wasteCost = Number((params.wastedGrams * spool.costPerGram).toFixed(2));
        // Deduct wasted filament
        await consumeFilament(
          {
            spoolId,
            grams: params.wastedGrams,
            type: 'WASTE',
            jobTicketId: ticket.id,
            reason: `Print failure: ${params.failureReason}`,
            operatorId: params.operatorId,
          },
          tx,
        );
      }
    }

    // Mark job ticket as FAILED
    await tx.productionJobTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'FAILED',
        failureReason: params.failureReason,
        actualDurationMinutes: (ticket.actualDurationMinutes || 0) + params.wastedMinutes,
        actualGrams: (ticket.actualGrams || 0) + params.wastedGrams,
      },
    });

    const failure = await tx.printFailure.create({
      data: {
        jobTicketId: ticket.id,
        printerId: params.printerId || ticket.printerId,
        spoolId,
        failureReason: params.failureReason,
        wastedGrams: params.wastedGrams,
        wastedMinutes: params.wastedMinutes,
        wasteCost,
        photoUrl: params.photoUrl,
        notes: params.notes,
        operatorId: params.operatorId,
      },
    });

    // If printer was in ERROR or clogged, update printer status
    if (params.printerId && ['NOZZLE_CLOG', 'FILAMENT_RUNOUT'].includes(params.failureReason)) {
      await tx.printer.update({
        where: { id: params.printerId },
        data: { status: 'MAINTENANCE' },
      });
    }

    return failure;
  });
}

/**
 * Creates a linked reprint ticket without overwriting the failure history of the original job.
 */
export async function createReprintJobTicket(params: {
  failedJobTicketId: string;
  reason?: string;
  operatorId?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const original = await tx.productionJobTicket.findUnique({
      where: { id: params.failedJobTicketId },
    });
    if (!original) throw new Error(`Original ticket ${params.failedJobTicketId} not found`);

    const count = await tx.productionJobTicket.count();
    const reprintTicketNumber = `${original.ticketNumber}-R1`;

    const reprint = await tx.productionJobTicket.create({
      data: {
        ticketNumber: reprintTicketNumber,
        orderId: original.orderId,
        orderItemId: original.orderItemId,
        material: original.material,
        color: original.color,
        designFileUrl: original.designFileUrl,
        estimatedGrams: original.estimatedGrams,
        estimatedDurationMinutes: original.estimatedDurationMinutes,
        operator: params.operatorId || original.operator,
        status: 'QUEUED',
        priority: 1, // High priority for reprints
        reprintFromTicketId: original.id,
        qcTemplate: original.qcTemplate,
      },
    });

    await tx.productionJobTicket.update({
      where: { id: original.id },
      data: { reprintedByTicketId: reprint.id },
    });

    return reprint;
  });
}

