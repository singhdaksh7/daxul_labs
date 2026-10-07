import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { OrderFilter } from '@/lib/orderPipeline';

const IST_MS = 5.5 * 60 * 60 * 1000;

/** Start of the current day in IST, as a UTC Date. */
export function startOfDayIST(d = new Date()): Date {
  const shifted = new Date(d.getTime() + IST_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_MS);
}
export function startOfMonthIST(d = new Date()): Date {
  const shifted = new Date(d.getTime() + IST_MS);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_MS);
}

/** Orders that count as revenue: paid and not cancelled. */
export const REVENUE_WHERE: Prisma.OrderWhereInput = {
  paymentStatus: 'paid',
  status: { not: 'cancelled' },
};

/** Orders containing at least one customizable item. */
export const CUSTOM_ITEMS_WHERE: Prisma.OrderWhereInput = {
  items: { some: { OR: [{ product: { customizable: true } }, { customizationFee: { gt: 0 } }] } },
};

// ---------------------------------------------------------------- dashboard
export async function getDashboardData() {
  const now = new Date();
  const today = startOfDayIST(now);
  const month = startOfMonthIST(now);

  const [
    revenueAgg,
    ordersToday,
    ordersMonth,
    pendingOrders,
    pendingCustomizations,
    statusGroups,
    lowStockRaw,
    customerRows,
    topGroups,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({ where: REVENUE_WHERE, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { createdAt: { gte: month } } }),
    prisma.order.count({ where: { status: { in: ['new', 'design_pending'] } } }),
    prisma.order.count({
      where: { AND: [CUSTOM_ITEMS_WHERE, { status: { in: ['new', 'design_pending'] } }] },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.product.findMany({
      where: { trackInventory: true, isArchived: false },
      select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
      orderBy: { stock: 'asc' },
      take: 200,
    }),
    prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(DISTINCT LOWER("customerEmail"))::int AS n FROM "Order"`,
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { status: { not: 'cancelled' } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        paymentStatus: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;

  const revenue = revenueAgg._sum.totalAmount ?? 0;
  const paidCount = revenueAgg._count._all;

  return {
    revenue,
    paidCount,
    averageOrderValue: paidCount > 0 ? revenue / paidCount : 0,
    ordersToday,
    ordersMonth,
    pendingOrders,
    pendingCustomizations,
    statusCounts,
    lowStock: lowStockRaw.filter((p) => p.stock <= p.lowStockThreshold),
    totalCustomers: customerRows[0]?.n ?? 0,
    topProducts: topGroups.map((g) => ({
      productId: g.productId,
      name: g.productName,
      quantity: g._sum.quantity ?? 0,
    })),
    recentOrders,
  };
}

// ------------------------------------------------------------------- orders
export function buildOrderWhere(filter: OrderFilter, search?: string): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  switch (filter) {
    case 'all':
      break;
    case 'paid':
      and.push({ paymentStatus: 'paid' });
      break;
    case 'cod':
      and.push({ paymentMethod: 'cod' });
      break;
    case 'custom':
      and.push(CUSTOM_ITEMS_WHERE);
      break;
    default:
      and.push({ status: filter });
  }
  const q = search?.trim();
  if (q) {
    and.push({
      OR: [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export const ORDER_PAGE_SIZE = 20;

export async function listOrders(opts: { filter: OrderFilter; search?: string; page: number; pageSize?: number }) {
  const pageSize = opts.pageSize ?? ORDER_PAGE_SIZE;
  const where = buildOrderWhere(opts.filter, opts.search);
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, opts.page) - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
        items: { select: { quantity: true, customizationFee: true } },
      },
    }),
  ]);
  return { total, pageSize, orders };
}

/** Orders for the pipeline (kanban) / customization views. */
export async function listPipelineOrders(view: 'manufacturing' | 'customizations') {
  const where: Prisma.OrderWhereInput =
    view === 'customizations'
      ? { AND: [CUSTOM_ITEMS_WHERE, { status: { not: 'cancelled' } }] }
      : { status: { not: 'cancelled' } };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
      courierName: true,
      trackingNumber: true,
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          customizations: true,
          customizationFee: true,
        },
      },
    },
  });
  const uploads = await prisma.uploadedFile.groupBy({
    by: ['orderId'],
    where: { orderId: { in: orders.map((o) => o.id) } },
    _count: { _all: true },
  });
  const uploadMap = new Map<string, number>();
  for (const u of uploads) if (u.orderId) uploadMap.set(u.orderId, u._count._all);
  return orders.map((o) => ({ ...o, uploadCount: uploadMap.get(o.id) ?? 0 }));
}

export async function getOrderDetail(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    omit: { razorpaySignature: true },
    include: {
      items: true,
      statusHistory: { orderBy: { timestamp: 'asc' } },
    },
  });
  if (!order) return null;
  const files = await prisma.uploadedFile.findMany({
    where: { orderId: id },
    select: { id: true, filename: true, originalName: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return { order, files };
}

// ---------------------------------------------------------------- customers
export const CUSTOMER_PAGE_SIZE = 20;

export async function listCustomers(opts: { search?: string; page: number; pageSize?: number }) {
  const pageSize = opts.pageSize ?? CUSTOMER_PAGE_SIZE;
  const offset = (Math.max(1, opts.page) - 1) * pageSize;
  const q = opts.search?.trim();
  const like = q ? `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  const filter = like
    ? Prisma.sql`WHERE "customerEmail" ILIKE ${like} OR "customerName" ILIKE ${like} OR "customerPhone" ILIKE ${like}`
    : Prisma.empty;

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<
      { email: string; name: string; phone: string; orders: number; ltv: number; last: Date }[]
    >`
      SELECT LOWER("customerEmail") AS email,
             (array_agg("customerName" ORDER BY "createdAt" DESC))[1] AS name,
             (array_agg("customerPhone" ORDER BY "createdAt" DESC))[1] AS phone,
             COUNT(*)::int AS orders,
             COALESCE(SUM(CASE WHEN "paymentStatus" = 'paid' AND "status" <> 'cancelled' THEN "totalAmount" ELSE 0 END), 0)::float AS ltv,
             MAX("createdAt") AS last
      FROM "Order"
      ${filter}
      GROUP BY LOWER("customerEmail")
      ORDER BY MAX("createdAt") DESC
      LIMIT ${pageSize} OFFSET ${offset}`,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT LOWER("customerEmail"))::int AS n FROM "Order" ${filter}`,
  ]);
  return { total: totalRows[0]?.n ?? 0, pageSize, customers: rows };
}

export async function getCustomerDetail(email: string) {
  const e = email.trim().toLowerCase();
  const orders = await prisma.order.findMany({
    where: { customerEmail: { equals: e, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    omit: { razorpaySignature: true },
    include: { items: true },
  });
  if (orders.length === 0) return null;
  const latest = orders[0];
  const addrMap = new Map<string, { street: string; city: string; state: string; pincode: string; country: string }>();
  for (const o of orders) {
    const key = [o.street, o.city, o.state, o.pincode, o.country].map((s) => s.trim().toLowerCase()).join('|');
    if (!addrMap.has(key)) {
      addrMap.set(key, { street: o.street, city: o.city, state: o.state, pincode: o.pincode, country: o.country });
    }
  }
  const lifetimeValue = orders
    .filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled')
    .reduce((s, o) => s + o.totalAmount, 0);
  const customizations = orders.flatMap((o) =>
    o.items
      .filter((i) => i.customizations && Object.keys(i.customizations as object).length > 0)
      .map((i) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        productName: i.productName,
        values: i.customizations as Record<string, unknown>,
      })),
  );
  return {
    email: e,
    name: latest.customerName,
    phone: latest.customerPhone,
    lifetimeValue,
    orders,
    addresses: Array.from(addrMap.values()),
    customizations,
  };
}

// ---------------------------------------------------------------- analytics
export type Granularity = 'daily' | 'monthly';

export async function getAnalytics(granularity: Granularity) {
  const now = new Date();
  const since =
    granularity === 'daily'
      ? new Date(startOfDayIST(now).getTime() - 29 * 86400000)
      : (() => {
          const s = startOfMonthIST(now);
          const shifted = new Date(s.getTime() + IST_MS);
          shifted.setUTCMonth(shifted.getUTCMonth() - 11);
          return new Date(shifted.getTime() - IST_MS);
        })();
  const unit = granularity === 'daily' ? 'day' : 'month';
  const fmt = granularity === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';

  const [series, topGroups, methodGroups, statusGroups, revAgg] = await Promise.all([
    prisma.$queryRaw<{ bucket: string; orders: number; revenue: number }[]>`
      SELECT to_char(date_trunc(${unit}, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'), ${fmt}) AS bucket,
             COUNT(*)::int AS orders,
             COALESCE(SUM(CASE WHEN "paymentStatus" = 'paid' THEN "totalAmount" ELSE 0 END), 0)::float AS revenue
      FROM "Order"
      WHERE "createdAt" >= ${since} AND "status" <> 'cancelled'
      GROUP BY 1 ORDER BY 1`,
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { status: { not: 'cancelled' } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    }),
    prisma.order.groupBy({
      by: ['paymentMethod'],
      where: { status: { not: 'cancelled' } },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({ where: REVENUE_WHERE, _sum: { totalAmount: true }, _count: { _all: true } }),
  ]);

  // zero-fill buckets
  const map = new Map(series.map((s) => [s.bucket, s]));
  const buckets: { label: string; orders: number; revenue: number }[] = [];
  const shiftedNow = new Date(now.getTime() + IST_MS);
  if (granularity === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(shiftedNow.getTime() - i * 86400000);
      const label = d.toISOString().slice(0, 10);
      const hit = map.get(label);
      buckets.push({ label, orders: hit?.orders ?? 0, revenue: hit?.revenue ?? 0 });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(shiftedNow.getUTCFullYear(), shiftedNow.getUTCMonth() - i, 1));
      const label = d.toISOString().slice(0, 7);
      const hit = map.get(label);
      buckets.push({ label, orders: hit?.orders ?? 0, revenue: hit?.revenue ?? 0 });
    }
  }

  const revenue = revAgg._sum.totalAmount ?? 0;
  const paidCount = revAgg._count._all;
  return {
    granularity,
    series: buckets,
    bestSellers: topGroups.map((g) => ({ name: g.productName, quantity: g._sum.quantity ?? 0 })),
    paymentSplit: methodGroups.map((g) => ({
      method: g.paymentMethod as string,
      orders: g._count._all,
      amount: g._sum.totalAmount ?? 0,
    })),
    statusDistribution: statusGroups.map((g) => ({ status: g.status as string, count: g._count._all })),
    averageOrderValue: paidCount > 0 ? revenue / paidCount : 0,
    totalRevenue: revenue,
    paidOrders: paidCount,
  };
}

// ------------------------------------------------------------------ helpers
export function safeFilenameFromUrl(value: string): string | null {
  const v = value.trim();
  if (!/^(https?:\/\/|\/)/i.test(v)) return null;
  try {
    const pathname = v.startsWith('/') ? v.split('?')[0] : new URL(v).pathname;
    const base = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
    return /^[A-Za-z0-9._-]{1,200}$/.test(base) && !base.includes('..') ? base : null;
  } catch {
    return null;
  }
}
