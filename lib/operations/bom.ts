import { prisma } from '@/lib/db';
import { MaterialUnit, Prisma } from '@prisma/client';

export interface CreateBomParams {
  name: string;
  productId: string;
  variantId?: string | null;
  items: Array<{
    materialItemId: string;
    quantity: number;
    unit: MaterialUnit;
    wasteAllowancePercent?: number;
    isOptional?: boolean;
    notes?: string;
  }>;
}

/**
 * Creates or updates a Bill of Materials with versioning support.
 * Never mutates historical production costing — increments version number.
 */
export async function createOrUpdateBom(params: CreateBomParams) {
  return await prisma.$transaction(async (tx) => {
    let bom = await tx.billOfMaterials.findFirst({
      where: {
        productId: params.productId,
        variantId: params.variantId || null,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    let nextVersionNumber = 1;

    if (!bom) {
      bom = await tx.billOfMaterials.create({
        data: {
          name: params.name,
          productId: params.productId,
          variantId: params.variantId,
        },
        include: { versions: true },
      });
    } else {
      nextVersionNumber = (bom.versions[0]?.versionNumber || 0) + 1;
      // Mark prior version as not current
      await tx.billOfMaterialsVersion.updateMany({
        where: { bomId: bom.id },
        data: { isCurrent: false },
      });
    }

    const version = await tx.billOfMaterialsVersion.create({
      data: {
        bomId: bom.id,
        versionNumber: nextVersionNumber,
        isCurrent: true,
        items: {
          create: params.items.map((item) => ({
            materialItemId: item.materialItemId,
            quantity: item.quantity,
            unit: item.unit,
            wasteAllowancePercent: item.wasteAllowancePercent ?? 5.0,
            isOptional: item.isOptional ?? false,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: { materialItem: true },
        },
      },
    });

    return { bom, version };
  });
}

/**
 * Calculates total required materials for an order or job ticket.
 * Evaluates shortage against current available stock.
 */
export async function checkMaterialAvailability(params: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}) {
  const bom = await prisma.billOfMaterials.findFirst({
    where: {
      productId: params.productId,
      variantId: params.variantId || null,
      active: true,
    },
    include: {
      versions: {
        where: { isCurrent: true },
        include: {
          items: {
            include: { materialItem: true },
          },
        },
      },
    },
  });

  if (!bom || !bom.versions[0]) {
    return {
      hasBom: false,
      isAvailable: true,
      items: [],
      shortages: [],
    };
  }

  const version = bom.versions[0];
  const itemsBreakdown = [];
  const shortages = [];

  for (const item of version.items) {
    const rawRequired = item.quantity * params.quantity;
    const withWaste = rawRequired * (1 + (item.wasteAllowancePercent || 0) / 100);
    const required = Number(withWaste.toFixed(2));
    const available = item.materialItem.currentQuantity - item.materialItem.reservedQuantity;
    const shortage = Math.max(0, Number((required - available).toFixed(2)));

    const itemReport = {
      materialItemId: item.materialItemId,
      materialName: item.materialItem.name,
      sku: item.materialItem.sku,
      unit: item.unit,
      required,
      available,
      shortage,
      isShortage: shortage > 0,
    };

    itemsBreakdown.push(itemReport);
    if (shortage > 0 && !item.isOptional) {
      shortages.push(itemReport);
    }
  }

  return {
    hasBom: true,
    bomVersionId: version.id,
    versionNumber: version.versionNumber,
    isAvailable: shortages.length === 0,
    items: itemsBreakdown,
    shortages,
  };
}

/**
 * Reserves required materials when a job is queued/approved.
 */
export async function reserveMaterialsForJob(
  jobTicketId: string,
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const ticket = await txClient.productionJobTicket.findUnique({
    where: { id: jobTicketId },
    include: {
      orderItem: true,
    },
  });
  if (!ticket) throw new Error(`Job ticket ${jobTicketId} not found`);

  // Find current BOM
  const availability = await checkMaterialAvailability({
    productId: ticket.orderItem.productId,
    quantity: 1,
  });

  if (!availability.hasBom || !availability.bomVersionId) {
    return { success: true, reservedCount: 0, reason: 'No BOM configured' };
  }

  // Link BOM version snapshot to ticket
  await txClient.productionJobTicket.update({
    where: { id: ticket.id },
    data: { bomVersionId: availability.bomVersionId },
  });

  // Reserve items
  for (const req of availability.items) {
    await txClient.materialReservation.create({
      data: {
        jobTicketId: ticket.id,
        materialItemId: req.materialItemId,
        quantity: req.required,
        unit: req.unit,
        status: 'RESERVED',
      },
    });

    await txClient.materialItem.update({
      where: { id: req.materialItemId },
      data: {
        reservedQuantity: { increment: req.required },
      },
    });
  }

  return { success: true, reservedCount: availability.items.length };
}

/**
 * Releases material reservations (e.g. On job cancellation).
 */
export async function releaseMaterialReservationsForJob(
  jobTicketId: string,
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const reservations = await txClient.materialReservation.findMany({
    where: { jobTicketId, status: 'RESERVED' },
  });

  for (const res of reservations) {
    await txClient.materialItem.update({
      where: { id: res.materialItemId },
      data: {
        reservedQuantity: { decrement: res.quantity },
      },
    });

    await txClient.materialReservation.update({
      where: { id: res.id },
      data: { status: 'RELEASED' },
    });
  }

  return { success: true, releasedCount: reservations.length };
}

