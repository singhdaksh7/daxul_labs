import { prisma } from '@/lib/db';

export interface AssignPrinterParams {
  jobTicketId: string;
  printerId: string;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
}

/**
 * Assigns a job ticket to a printer and calculates estimated completion.
 */
export async function assignJobToPrinter(params: AssignPrinterParams) {
  const printer = await prisma.printer.findUnique({
    where: { id: params.printerId },
  });
  if (!printer) throw new Error(`Printer ${params.printerId} not found`);

  const ticket = await prisma.productionJobTicket.findUnique({
    where: { id: params.jobTicketId },
  });
  if (!ticket) throw new Error(`Job ticket ${params.jobTicketId} not found`);

  const durationMin = ticket.estimatedDurationMinutes || 120;
  const startTime = params.scheduledStartTime || new Date();
  const endTime = params.scheduledEndTime || new Date(startTime.getTime() + durationMin * 60 * 1000);

  return await prisma.productionJobTicket.update({
    where: { id: ticket.id },
    data: {
      printerId: printer.id,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      status: 'QUEUED',
    },
  });
}

/**
 * Evaluates production capacity, printer workloads, and orders at risk.
 */
export async function getProductionCapacityMetrics() {
  const [printers, queuedTickets, printingTickets] = await Promise.all([
    prisma.printer.findMany(),
    prisma.productionJobTicket.findMany({
      where: { status: 'QUEUED' },
      include: { order: true },
    }),
    prisma.productionJobTicket.findMany({
      where: { status: 'PRINTING' },
    }),
  ]);

  const availablePrinters = printers.filter((p) => p.status === 'AVAILABLE').length;
  const busyPrinters = printers.filter((p) => p.status === 'PRINTING').length;
  const maintenancePrinters = printers.filter((p) => p.status === 'MAINTENANCE').length;

  const totalQueuedPrintMinutes = queuedTickets.reduce((acc, t) => acc + (t.estimatedDurationMinutes || 120), 0);
  const totalQueuedHours = Number((totalQueuedPrintMinutes / 60).toFixed(1));

  // Daily theoretical capacity (e.g. 20 operational hours per printer per day)
  const activeFleetSize = printers.filter((p) => p.status !== 'OFFLINE' && p.status !== 'MAINTENANCE').length;
  const capacityNext24Hours = activeFleetSize * 20;
  const capacityNext7Days = capacityNext24Hours * 7;

  // Utilization calculation
  const fleetUtilizationPercent = printers.length > 0 ? Number(((busyPrinters / printers.length) * 100).toFixed(1)) : 0;

  // Deadline Risk evaluation
  const now = Date.now();
  const atRiskTickets = [];
  const overdueTickets = [];

  for (const ticket of queuedTickets) {
    const orderCreatedAt = ticket.order.createdAt.getTime();
    const ageDays = (now - orderCreatedAt) / (24 * 60 * 60 * 1000);

    if (ageDays > 5) {
      overdueTickets.push(ticket);
    } else if (ageDays > 3) {
      atRiskTickets.push(ticket);
    }
  }

  return {
    printers: {
      total: printers.length,
      available: availablePrinters,
      busy: busyPrinters,
      maintenance: maintenancePrinters,
      utilizationPercent: fleetUtilizationPercent,
    },
    workload: {
      queuedJobsCount: queuedTickets.length,
      printingJobsCount: printingTickets.length,
      totalQueuedHours,
      capacityNext24Hours,
      capacityNext7Days,
    },
    risk: {
      atRiskCount: atRiskTickets.length,
      overdueCount: overdueTickets.length,
    },
  };
}

