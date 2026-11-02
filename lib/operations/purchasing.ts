import { prisma } from '@/lib/db';
import { adjustMaterialStock } from './materials';

export interface CreateSupplierParams {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  minimumOrder?: number;
  notes?: string;
}

export async function createSupplier(params: CreateSupplierParams) {
  return await prisma.supplier.create({
    data: {
      name: params.name,
      contactName: params.contactName,
      email: params.email,
      phone: params.phone,
      address: params.address,
      gstin: params.gstin,
      paymentTerms: params.paymentTerms ?? 'Net 30',
      leadTimeDays: params.leadTimeDays ?? 7,
      minimumOrder: params.minimumOrder ?? 0,
      notes: params.notes,
    },
  });
}

export interface CreatePurchaseOrderParams {
  supplierId: string;
  expectedDate?: Date;
  notes?: string | null;
  items: Array<{
    materialItemId: string;
    orderedQuantity: number;
    unitCost: number;
    taxPercent?: number;
  }>;
}

export async function createPurchaseOrder(params: CreatePurchaseOrderParams) {
  const count = await prisma.purchaseOrder.count();
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const poNumber = `DXL-PO-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

  let totalAmount = 0;
  let taxAmount = 0;

  for (const item of params.items) {
    const lineTotal = item.orderedQuantity * item.unitCost;
    const lineTax = lineTotal * ((item.taxPercent ?? 18) / 100);
    totalAmount += lineTotal + lineTax;
    taxAmount += lineTax;
  }

  return await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: params.supplierId,
      status: 'DRAFT',
      totalAmount: Number(totalAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      expectedDate: params.expectedDate,
      notes: params.notes,
      items: {
        create: params.items.map((i) => ({
          materialItemId: i.materialItemId,
          orderedQuantity: i.orderedQuantity,
          unitCost: i.unitCost,
          taxPercent: i.taxPercent ?? 18.0,
        })),
      },
    },
    include: {
      items: {
        include: { materialItem: true },
      },
      supplier: true,
    },
  });
}

export interface ReceiveGoodsParams {
  purchaseOrderId: string;
  receivedBy: string;
  notes?: string | null;
  items: Array<{
    purchaseOrderItemId: string;
    materialItemId: string;
    receivedQuantity: number;
    damagedQuantity?: number;
    lotNumber?: string;
  }>;
}

/**
 * Processes Goods Receipt Note (GRN), updating material inventory quantities and spool records.
 */
export async function receiveGoods(params: ReceiveGoodsParams) {
  return await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: params.purchaseOrderId },
      include: { items: true },
    });
    if (!po) throw new Error(`PO ${params.purchaseOrderId} not found`);

    const receiptCount = await tx.goodsReceipt.count();
    const receiptNumber = `DXL-GRN-${String(receiptCount + 1).padStart(5, '0')}`;

    for (const item of params.items) {
      const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
      if (!poItem) continue;

      const receivedGoodQty = item.receivedQuantity - (item.damagedQuantity || 0);

      // Update PO Item quantities
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQuantity: { increment: item.receivedQuantity },
          damagedQuantity: { increment: item.damagedQuantity || 0 },
        },
      });

      // Update Material Stock
      if (receivedGoodQty > 0) {
        await adjustMaterialStock(
          {
            materialItemId: item.materialItemId,
            type: 'PURCHASE',
            quantityDelta: receivedGoodQty,
            reason: `GRN: ${receiptNumber} against PO ${po.poNumber}`,
            referenceId: po.id,
            adminUserId: params.receivedBy,
          },
          tx,
        );
      }
    }

    // Refresh PO to check if all items received
    const updatedPo = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });

    const allReceived = updatedPo?.items.every((i) => i.receivedQuantity >= i.orderedQuantity);
    const anyReceived = updatedPo?.items.some((i) => i.receivedQuantity > 0);

    const nextStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: nextStatus },
    });

    const receipt = await tx.goodsReceipt.create({
      data: {
        receiptNumber,
        purchaseOrderId: po.id,
        receivedBy: params.receivedBy,
        notes: params.notes,
        items: params.items as any,
      },
    });

    return { receipt, poStatus: nextStatus };
  });
}

