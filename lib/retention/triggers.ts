import { prisma } from '@/lib/db';
import { queueNotificationJob } from './automation';
import { getRetentionSettings } from './settings';

/**
 * Triggered when product inventory transitions from 0 -> positive.
 * Queues notifications for active back-in-stock subscriptions idempotently.
 */
export async function triggerBackInStockRestockAlerts(productId: string, variantId?: string | null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });
  if (!product) return;

  const subscriptions = await prisma.backInStockSubscription.findMany({
    where: {
      productId,
      ...(variantId ? { variantId } : {}),
      status: 'PENDING',
    },
  });

  const now = new Date();
  for (const sub of subscriptions) {
    const idempotencyKey = `restock_${sub.id}_${now.toISOString().slice(0, 10)}`;

    await queueNotificationJob({
      triggerEvent: 'BACK_IN_STOCK',
      recipient: sub.email,
      idempotencyKey,
      payload: {
        product_name: product.name,
        product_url: `${process.env.NEXTAUTH_URL || 'https://daxullabs.com'}/shop/${product.slug}`,
      },
    });

    // Mark as notified in DB
    await prisma.backInStockSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'NOTIFIED',
        notifiedAt: now,
      },
    });
  }
}

/**
 * Schedules a post-purchase review request when an order transitions to DELIVERED.
 */
export async function scheduleReviewRequestForDeliveredOrder(params: {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  firstProductSlug: string;
  firstProductName: string;
}) {
  const settings = await getRetentionSettings();
  const delayDays = settings.reviewRequestDelayDays || 5;
  const scheduledFor = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

  const idempotencyKey = `review_req_${params.orderId}`;

  return await queueNotificationJob({
    triggerEvent: 'REVIEW_REQUEST',
    recipient: params.customerEmail,
    recipientName: params.customerName,
    scheduledFor,
    idempotencyKey,
    payload: {
      customer_name: params.customerName,
      order_number: params.orderNumber,
      product_name: params.firstProductName,
      review_url: `${process.env.NEXTAUTH_URL || 'https://daxullabs.com'}/shop/${params.firstProductSlug}#write-review`,
    },
  });
}

/**
 * Win-back campaign processor: identifies legitimate past buyers with no orders in X days
 * and queues gentle win-back invites with frequency capping.
 */
export async function scheduleWinbackCampaigns() {
  const settings = await getRetentionSettings();
  if (!settings.winbackEnabled) return { triggered: 0 };

  const thresholdDays = settings.winbackInactivityDays || 60;
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

  // Find customers with paid orders whose most recent order is older than cutoff
  const eligibleUsers = await prisma.user.findMany({
    where: {
      orders: {
        some: { paymentStatus: 'paid' },
        none: { createdAt: { gte: cutoff }, paymentStatus: 'paid' },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPreferences: true,
    },
    take: 50,
  });

  let count = 0;
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  for (const user of eligibleUsers) {
    const prefs = (user.notificationPreferences as any) || {};
    // Obey marketing consent
    if (prefs.emailMarketing === false) continue;

    const idempotencyKey = `winback_${user.id}_${currentMonthKey}`;
    const job = await queueNotificationJob({
      triggerEvent: 'WINBACK',
      recipient: user.email,
      recipientName: user.name || 'Valued Customer',
      idempotencyKey,
      payload: {
        customer_name: user.name || 'Friend',
        discount_percent: settings.winbackDiscountPercent,
      },
    });

    if (job) count++;
  }

  return { triggered: count };
}

