import { prisma } from '@/lib/db';
import { MaterialCategory, MaterialUnit } from '@prisma/client';

export const PACKAGING_ITEMS_CONFIG = [
  { name: 'DAXUL Shipping Box - Small', sku: 'PKG-BOX-SM', category: MaterialCategory.PACKAGING, unit: MaterialUnit.PIECE, unitCost: 35.0, reorderPoint: 50 },
  { name: 'DAXUL Shipping Box - Medium', sku: 'PKG-BOX-MD', category: MaterialCategory.PACKAGING, unit: MaterialUnit.PIECE, unitCost: 55.0, reorderPoint: 50 },
  { name: 'DAXUL Shipping Box - Large', sku: 'PKG-BOX-LG', category: MaterialCategory.PACKAGING, unit: MaterialUnit.PIECE, unitCost: 85.0, reorderPoint: 30 },
  { name: 'Honeycomb Paper Roll', sku: 'PKG-PAP-ROLL', category: MaterialCategory.PACKAGING, unit: MaterialUnit.ROLL, unitCost: 650.0, reorderPoint: 5 },
  { name: 'DAXUL Monogram Sealing Tape', sku: 'PKG-TAPE-ROLL', category: MaterialCategory.PACKAGING, unit: MaterialUnit.ROLL, unitCost: 180.0, reorderPoint: 10 },
  { name: 'Welcome & Thank You Card', sku: 'PKG-INS-CARD', category: MaterialCategory.PRINTED_INSERT, unit: MaterialUnit.PIECE, unitCost: 4.5, reorderPoint: 100 },
  { name: 'Lithophane Care & USB Guide', sku: 'PKG-INS-GUIDE', category: MaterialCategory.PRINTED_INSERT, unit: MaterialUnit.PIECE, unitCost: 6.0, reorderPoint: 100 },
];

/**
 * Ensures packaging standard material items exist in DB inventory.
 */
export async function seedStandardPackagingMaterials() {
  for (const item of PACKAGING_ITEMS_CONFIG) {
    await prisma.materialItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        unitCost: item.unitCost,
        reorderPoint: item.reorderPoint,
        currentQuantity: 100, // Initial workshop stock
      },
    });
  }
}

/**
 * Returns orders ready for packing workstation with checklist verifications.
 */
export async function getPackingWorkstationOrders() {
  return await prisma.order.findMany({
    where: {
      status: 'qc', // Passed QC, awaiting packing
    },
    include: {
      items: true,
      jobTickets: {
        where: { status: 'DONE' },
      },
      shipments: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

