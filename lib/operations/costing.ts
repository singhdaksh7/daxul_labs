import { prisma } from '@/lib/db';
import { getOperationsSettings } from './settings';

export interface ComputeProductCostParams {
  productId: string;
  variantId?: string | null;
  targetRetailPrice?: number;
}

/**
 * Calculates real manufactured unit economics per product/variant.
 * Combines Filament, Components, Packaging, Electricity, Failure buffer, Labor, and Fees.
 */
export async function computeProductCostModel(params: ComputeProductCostParams) {
  const settings = await getOperationsSettings();

  const [product, bom] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.productId },
      include: { variantGroups: { include: { variants: true } } },
    }),
    prisma.billOfMaterials.findFirst({
      where: {
        productId: params.productId,
        variantId: params.variantId || null,
        active: true,
      },
      include: {
        versions: {
          where: { isCurrent: true },
          include: { items: { include: { materialItem: true } } },
        },
      },
    }),
  ]);

  if (!product) throw new Error(`Product ${params.productId} not found`);

  let filamentCost = 0;
  let componentsCost = 0;
  let packagingCost = 0;

  if (bom && bom.versions[0]) {
    for (const item of bom.versions[0].items) {
      const lineCost = item.quantity * item.materialItem.unitCost;
      if (item.materialItem.category === 'FILAMENT') {
        filamentCost += lineCost;
      } else if (item.materialItem.category === 'PACKAGING' || item.materialItem.category === 'PRINTED_INSERT') {
        packagingCost += lineCost;
      } else {
        componentsCost += lineCost;
      }
    }
  }

  // Failure allocation (e.g. 5% standard waste buffer)
  const failureAllocationCost = Number(((filamentCost + componentsCost) * 0.05).toFixed(2));

  // Electricity estimate (150W printer running for estimated 3 hours = 0.45 kWh * rate)
  const estimatedHours = 3.0;
  const kwhConsumed = (150 / 1000) * estimatedHours;
  const electricityCost = Number((kwhConsumed * settings.kwhElectricityRate).toFixed(2));

  // Labor estimate (0.25 hrs finishing/QC/packing * standard hourly rate)
  const laborHours = 0.25;
  const laborCost = Number((laborHours * settings.standardHourlyLaborRate).toFixed(2));

  // Payment gateway fee (approx 2% + GST)
  const retailPrice = params.targetRetailPrice || product.price;
  const gatewayFeeEstimate = Number((retailPrice * 0.0236).toFixed(2));

  // Shipping subsidy (free shipping absorption buffer ~ ₹40)
  const shippingSubsidyEstimate = 40.0;

  const totalCostOfGoods = Number(
    (filamentCost + componentsCost + packagingCost + failureAllocationCost + electricityCost + laborCost).toFixed(2),
  );

  const grossProfit = Number((retailPrice - totalCostOfGoods).toFixed(2));
  const estimatedMarginPercent = retailPrice > 0 ? Number(((grossProfit / retailPrice) * 100).toFixed(1)) : 0;

  return {
    productId: product.id,
    variantId: params.variantId,
    filamentCost: Number(filamentCost.toFixed(2)),
    componentsCost: Number(componentsCost.toFixed(2)),
    packagingCost: Number(packagingCost.toFixed(2)),
    failureAllocationCost,
    electricityCost,
    depreciationCost: 15.0, // Machine depreciation allocation
    laborCost,
    gatewayFeeEstimate,
    shippingSubsidyEstimate,
    totalCostOfGoods,
    targetRetailPrice: retailPrice,
    grossProfit,
    estimatedMarginPercent,
  };
}

/**
 * Creates an immutable OrderCostSnapshot upon order completion.
 * Never recalculates historical order margin using future material costs.
 */
export async function createOrderCostSnapshot(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);

  let totalCOGS = 0;
  let materialCost = 0;
  let packagingCost = 0;

  for (const item of order.items) {
    const cost = await computeProductCostModel({ productId: item.productId });
    materialCost += cost.filamentCost + cost.componentsCost;
    packagingCost += cost.packagingCost;
    totalCOGS += cost.totalCostOfGoods;
  }

  const revenue = order.totalAmount;
  const grossProfit = Number((revenue - totalCOGS).toFixed(2));
  const grossMarginPercent = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0;
  const paymentFee = Number((revenue * 0.0236).toFixed(2));
  const contributionMargin = Number((grossProfit - paymentFee - (order.shippingFee || 0)).toFixed(2));

  return await prisma.orderCostSnapshot.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      orderId: order.id,
      materialCost,
      packagingCost,
      directLaborCost: 40.0,
      machineCost: 20.0,
      electricityCost: 15.0,
      failureAllocation: 10.0,
      totalCOGS,
      paymentFee,
      shippingCostActual: 90.0,
      grossProfit,
      grossMarginPercent,
      contributionMargin,
      isFinalized: true,
    },
  });
}

