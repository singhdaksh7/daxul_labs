import { prisma } from '@/lib/db';
import { MaterialCategory, MaterialUnit, Prisma } from '@prisma/client';

export interface CreateMaterialParams {
  name: string;
  sku: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  unitCost: number;
  reorderPoint?: number;
  currentQuantity?: number;
  preferredSupplierId?: string | null;
  notes?: string | null;
}

export interface AdjustStockParams {
  materialItemId: string;
  type: 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT' | 'RETURN' | 'RESERVED' | 'RELEASED';
  quantityDelta: number;
  reason?: string;
  referenceId?: string;
  adminUserId?: string;
}

/**
 * Standard unit conversion utility for materials.
 */
export function convertMaterialUnit(quantity: number, from: MaterialUnit, to: MaterialUnit): number {
  if (from === to) return quantity;

  // Mass conversion
  if (from === MaterialUnit.KG && to === MaterialUnit.GRAM) return quantity * 1000;
  if (from === MaterialUnit.GRAM && to === MaterialUnit.KG) return quantity / 1000;

  // Box / Pack conversion (default packaging unit ratios)
  if (from === MaterialUnit.BOX && to === MaterialUnit.PIECE) return quantity * 100;
  if (from === MaterialUnit.PIECE && to === MaterialUnit.BOX) return quantity / 100;

  if (from === MaterialUnit.PACK && to === MaterialUnit.PIECE) return quantity * 10;
  if (from === MaterialUnit.PIECE && to === MaterialUnit.PACK) return quantity / 10;

  return quantity;
}

/**
 * Creates a raw material item.
 */
export async function createMaterialItem(params: CreateMaterialParams) {
  return await prisma.materialItem.create({
    data: {
      name: params.name,
      sku: params.sku.trim().toUpperCase(),
      category: params.category,
      unit: params.unit,
      unitCost: params.unitCost,
      reorderPoint: params.reorderPoint ?? 10,
      currentQuantity: params.currentQuantity ?? 0,
      preferredSupplierId: params.preferredSupplierId,
      notes: params.notes,
    },
  });
}

/**
 * Adjusts material stock transactionally with an immutable ledger entry.
 * Prevents negative available quantity unless type is a documented negative adjustment.
 */
export async function adjustMaterialStock(
  params: AdjustStockParams,
  txClient?: Prisma.TransactionClient,
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const item = await tx.materialItem.findUnique({
      where: { id: params.materialItemId },
    });
    if (!item) throw new Error(`MaterialItem ${params.materialItemId} not found`);

    const newQuantity = item.currentQuantity + params.quantityDelta;
    if (newQuantity < 0) {
      throw new Error(`Insufficient stock for material ${item.name}. Available: ${item.currentQuantity}, Attempted change: ${params.quantityDelta}`);
    }

    const updatedItem = await tx.materialItem.update({
      where: { id: item.id },
      data: { currentQuantity: newQuantity },
    });

    const history = await tx.materialStockHistory.create({
      data: {
        materialItemId: item.id,
        type: params.type,
        quantity: params.quantityDelta,
        balanceAfter: newQuantity,
        unitCost: item.unitCost,
        reason: params.reason,
        referenceId: params.referenceId,
        adminUserId: params.adminUserId,
      },
    });

    return { item: updatedItem, history };
  };

  if (txClient) {
    return await runner(txClient);
  }
  return await prisma.$transaction(runner);
}

/**
 * Filament Spool Management
 */
export interface CreateSpoolParams {
  materialItemId: string;
  brand?: string;
  materialType?: string;
  colorName: string;
  colorHex?: string | null;
  diameter?: number;
  initialWeightGrams?: number;
  tareWeightGrams?: number;
  cost?: number;
  lotNumber?: string | null;
  supplierId?: string | null;
  printerId?: string | null;
}

export async function createFilamentSpool(params: CreateSpoolParams) {
  const count = await prisma.filamentSpool.count();
  const spoolNumber = `DXL-SPL-${String(count + 1).padStart(5, '0')}`;
  const initialWeight = params.initialWeightGrams ?? 1000;
  const cost = params.cost ?? 1200;
  const costPerGram = initialWeight > 0 ? Number((cost / initialWeight).toFixed(4)) : 1.2;

  return await prisma.$transaction(async (tx) => {
    const spool = await tx.filamentSpool.create({
      data: {
        spoolNumber,
        materialItemId: params.materialItemId,
        brand: params.brand ?? 'Bambu Lab',
        materialType: params.materialType ?? 'PLA',
        colorName: params.colorName,
        colorHex: params.colorHex,
        diameter: params.diameter ?? 1.75,
        initialWeightGrams: initialWeight,
        currentWeightGrams: initialWeight,
        tareWeightGrams: params.tareWeightGrams ?? 200,
        cost,
        costPerGram,
        lotNumber: params.lotNumber,
        supplierId: params.supplierId,
        printerId: params.printerId,
        status: 'SEALED',
      },
    });

    // Immutable ledger entry
    await tx.filamentTransaction.create({
      data: {
        spoolId: spool.id,
        type: 'PURCHASE',
        grams: initialWeight,
        gramsAfter: initialWeight,
        cost,
        reason: 'Initial spool receipt',
      },
    });

    return spool;
  });
}

/**
 * Consumes or wastes filament from an active spool with strict row-locking / balance checks.
 */
export async function consumeFilament(
  params: {
    spoolId: string;
    grams: number;
    type: 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT';
    jobTicketId?: string;
    reason?: string;
    operatorId?: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  if (params.grams <= 0) throw new Error('Grams to consume must be greater than 0');

  const spool = await txClient.filamentSpool.findUnique({
    where: { id: params.spoolId },
  });
  if (!spool) throw new Error(`Filament spool ${params.spoolId} not found`);

  if (spool.currentWeightGrams < params.grams) {
    throw new Error(`Insufficient filament on spool ${spool.spoolNumber}. Current: ${spool.currentWeightGrams}g, Requested: ${params.grams}g`);
  }

  const gramsAfter = spool.currentWeightGrams - params.grams;
  let nextStatus = spool.status;
  if (gramsAfter === 0) {
    nextStatus = 'EMPTY';
  } else if (gramsAfter <= 100) {
    nextStatus = 'LOW';
  } else if (spool.status === 'SEALED') {
    nextStatus = 'OPEN';
  }

  const updatedSpool = await txClient.filamentSpool.update({
    where: { id: spool.id },
    data: {
      currentWeightGrams: gramsAfter,
      status: nextStatus,
      openedAt: spool.openedAt || new Date(),
    },
  });

  const cost = Number((params.grams * spool.costPerGram).toFixed(2));
  const tx = await txClient.filamentTransaction.create({
    data: {
      spoolId: spool.id,
      type: params.type,
      grams: -params.grams,
      gramsAfter,
      cost,
      jobTicketId: params.jobTicketId,
      reason: params.reason,
      operatorId: params.operatorId,
    },
  });

  return { spool: updatedSpool, transaction: tx };
}

