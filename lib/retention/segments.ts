import { prisma } from '@/lib/db';

export interface SegmentRule {
  field: 'orderCount' | 'totalSpend' | 'averageOrderValue' | 'daysSinceLastOrder' | 'customProductBuyer';
  operator: 'gte' | 'lte' | 'eq' | 'isTrue';
  value: number | boolean;
}

export interface SegmentDefinition {
  name: string;
  slug: string;
  description: string;
  rules: SegmentRule[];
}

export const PRESET_SEGMENTS: SegmentDefinition[] = [
  {
    name: 'New Customers',
    slug: 'new-customers',
    description: 'Customers with exactly 1 paid order',
    rules: [{ field: 'orderCount', operator: 'eq', value: 1 }],
  },
  {
    name: 'Repeat Customers',
    slug: 'repeat-customers',
    description: 'Customers with 2 or more paid orders',
    rules: [{ field: 'orderCount', operator: 'gte', value: 2 }],
  },
  {
    name: 'VIP High Value',
    slug: 'vip',
    description: 'Lifetime commerce spend exceeding ₹10,000',
    rules: [{ field: 'totalSpend', operator: 'gte', value: 10000 }],
  },
  {
    name: 'High AOV Buyers',
    slug: 'high-aov',
    description: 'Average order value exceeding ₹3,000',
    rules: [{ field: 'averageOrderValue', operator: 'gte', value: 3000 }],
  },
  {
    name: 'Inactive 60 Days',
    slug: 'inactive-60',
    description: 'Purchased previously but no order in the last 60 days',
    rules: [
      { field: 'orderCount', operator: 'gte', value: 1 },
      { field: 'daysSinceLastOrder', operator: 'gte', value: 60 },
    ],
  },
  {
    name: 'Inactive 90 Days',
    slug: 'inactive-90',
    description: 'Purchased previously but no order in the last 90 days',
    rules: [
      { field: 'orderCount', operator: 'gte', value: 1 },
      { field: 'daysSinceLastOrder', operator: 'gte', value: 90 },
    ],
  },
];

/**
 * Evaluates whether a customer matches a segment's behavioral rules dynamically.
 */
export async function getSegmentCustomerCount(rules: SegmentRule[]): Promise<number> {
  // Aggregate user commerce metrics from real paid orders
  const users = await prisma.user.findMany({
    include: {
      orders: {
        where: { paymentStatus: 'paid' },
        select: { totalAmount: true, createdAt: true },
      },
    },
  });

  const now = Date.now();

  const matchingUsers = users.filter((u) => {
    const paidOrders = u.orders;
    const orderCount = paidOrders.length;
    const totalSpend = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrderValue = orderCount > 0 ? totalSpend / orderCount : 0;

    let daysSinceLastOrder = 9999;
    if (orderCount > 0) {
      const mostRecent = Math.max(...paidOrders.map((o) => new Date(o.createdAt).getTime()));
      daysSinceLastOrder = Math.floor((now - mostRecent) / (1000 * 60 * 60 * 24));
    }

    return rules.every((r) => {
      let metricVal: number | boolean = 0;
      if (r.field === 'orderCount') metricVal = orderCount;
      else if (r.field === 'totalSpend') metricVal = totalSpend;
      else if (r.field === 'averageOrderValue') metricVal = averageOrderValue;
      else if (r.field === 'daysSinceLastOrder') metricVal = daysSinceLastOrder;

      if (r.operator === 'gte') return (metricVal as number) >= (r.value as number);
      if (r.operator === 'lte') return (metricVal as number) <= (r.value as number);
      if (r.operator === 'eq') return metricVal === r.value;
      if (r.operator === 'isTrue') return Boolean(metricVal);
      return true;
    });
  });

  return matchingUsers.length;
}

