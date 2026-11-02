import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/notifications/email';

export type AutomationTriggerEvent =
  | 'WELCOME'
  | 'ABANDONED_CHECKOUT'
  | 'ORDER_FOLLOWUP'
  | 'REVIEW_REQUEST'
  | 'BACK_IN_STOCK'
  | 'REFERRAL_REWARD'
  | 'GIFT_CARD_DELIVERY'
  | 'STORE_CREDIT_ISSUED'
  | 'LOYALTY_POINTS_EARNED'
  | 'WINBACK';

/**
 * Sanitizes template string replacing only approved placeholders {{variable}}.
 * Protects against arbitrary executable injections.
 */
export function renderTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      const val = String(variables[key]);
      // Basic HTML entity encode to sanitize user inputs
      return val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    return '';
  });
}

/**
 * Queue a lifecycle notification job idempotently.
 */
export async function queueNotificationJob(params: {
  triggerEvent: AutomationTriggerEvent;
  recipient: string;
  recipientName?: string;
  channel?: 'email' | 'whatsapp';
  scheduledFor?: Date;
  idempotencyKey: string;
  payload: Record<string, any>;
}) {
  // Check if automation is active
  const automation = await prisma.notificationAutomation.findFirst({
    where: {
      triggerEvent: params.triggerEvent,
      isEnabled: true,
    },
    include: { template: true },
  });

  if (!automation) {
    return null; // Not enabled or configured
  }

  const scheduledFor =
    params.scheduledFor ||
    new Date(Date.now() + (automation.delayMinutes || 0) * 60 * 1000);

  // Frequency cap check if specified
  if (automation.maxFrequencyDays > 0) {
    const cutoff = new Date(Date.now() - automation.maxFrequencyDays * 24 * 60 * 60 * 1000);
    const recentSent = await prisma.notificationJob.findFirst({
      where: {
        automationId: automation.id,
        recipient: params.recipient,
        status: 'SENT',
        processedAt: { gte: cutoff },
      },
    });
    if (recentSent) {
      return null; // Frequency capped
    }
  }

  // Idempotent upsert
  const job = await prisma.notificationJob.upsert({
    where: { idempotencyKey: params.idempotencyKey },
    create: {
      automationId: automation.id,
      templateId: automation.templateId,
      channel: params.channel || automation.channel,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: automation.template?.subject || `DAXUL Notification: ${params.triggerEvent}`,
      payload: params.payload,
      status: 'PENDING',
      scheduledFor,
      idempotencyKey: params.idempotencyKey,
    },
    update: {},
  });

  return job;
}

/**
 * Executes due notification jobs (queue worker pattern).
 */
export async function processDueNotificationJobs(limit = 20) {
  const now = new Date();
  const dueJobs = await prisma.notificationJob.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
      attempts: { lt: 3 },
    },
    include: { template: true },
    take: limit,
  });

  const results = [];

  for (const job of dueJobs) {
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    try {
      const bodyTemplate = job.template?.body || 'Hello {{customer_name}}, this is an update from DAXUL LABS.';
      const renderedBody = renderTemplate(bodyTemplate, {
        customer_name: job.recipientName || 'Customer',
        ...(job.payload as Record<string, any>),
      });

      if (job.channel === 'email') {
        const emailRes = await sendEmail({
          to: job.recipient,
          name: job.recipientName || undefined,
          subject: job.subject || 'DAXUL LABS Update',
          event: 'order_confirmed', // compatible with existing EmailPayload
          html: renderedBody,
        });

        if (emailRes.success) {
          await prisma.notificationJob.update({
            where: { id: job.id },
            data: { status: 'SENT', processedAt: new Date() },
          });
          results.push({ id: job.id, status: 'SENT' });
        } else {
          throw new Error('Email delivery dispatch error');
        }
      } else {
        // Other channels (e.g. simulated WhatsApp)
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: 'SENT', processedAt: new Date() },
        });
        results.push({ id: job.id, status: 'SENT' });
      }
    } catch (err: any) {
      const nextStatus = job.attempts + 1 >= job.maxAttempts ? 'FAILED' : 'PENDING';
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: nextStatus,
          lastError: err.message || 'Worker processing error',
        },
      });
      results.push({ id: job.id, status: nextStatus, error: err.message });
    }
  }

  return results;
}

