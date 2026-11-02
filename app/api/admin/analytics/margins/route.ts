import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeProductCostModel } from '@/lib/operations/costing';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [products, snapshots] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, price: true },
      take: 20,
    }),
    prisma.orderCostSnapshot.findMany({
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true, customerEmail: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  const models = [];
  for (const p of products) {
    try {
      const model = await computeProductCostModel({ productId: p.id });
      models.push({ ...model, productName: p.name, sku: p.sku });
    } catch (e) {
      // Missing BOM handled gracefully
    }
  }

  // Summary aggregates
  const totalRevenue = snapshots.reduce((acc, s) => acc + s.order.totalAmount, 0);
  const totalCOGS = snapshots.reduce((acc, s) => acc + s.totalCOGS, 0);
  const totalGrossProfit = Number((totalRevenue - totalCOGS).toFixed(2));
  const overallGrossMargin = totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    metrics: {
      totalRevenue,
      totalCOGS,
      totalGrossProfit,
      overallGrossMargin,
    },
    productCostModels: models,
    orderCostSnapshots: snapshots,
  });
}

