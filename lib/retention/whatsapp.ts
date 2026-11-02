import { prisma } from '@/lib/db';
import { getRetentionSettings } from './settings';

export interface WhatsAppMessagePayload {
  toPhone: string;
  templateName: string;
  parameters: Record<string, string>;
  isMarketing?: boolean;
}

export interface WhatsAppProvider {
  name: string;
  sendTemplate(payload: WhatsAppMessagePayload): Promise<{ success: boolean; providerId?: string; error?: string }>;
  sendTransactional(toPhone: string, text: string): Promise<{ success: boolean; providerId?: string; error?: string }>;
  getMessageStatus(providerId: string): Promise<'sent' | 'delivered' | 'read' | 'failed'>;
}

/**
 * Mock Provider for development, automated tests, and staging.
 */
class MockWhatsAppProvider implements WhatsAppProvider {
  name = 'mock';

  async sendTemplate(payload: WhatsAppMessagePayload) {
    return {
      success: true,
      providerId: `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
  }

  async sendTransactional(toPhone: string, text: string) {
    return {
      success: true,
      providerId: `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
  }

  async getMessageStatus(providerId: string) {
    return 'delivered' as const;
  }
}

/**
 * Meta Cloud API Provider (production configuration).
 */
class MetaWhatsAppCloudProvider implements WhatsAppProvider {
  name = 'meta';

  constructor(
    private apiKey: string,
    private phoneNumberId: string,
  ) {}

  async sendTemplate(payload: WhatsAppMessagePayload) {
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.toPhone.replace(/[^0-9]/g, ''),
          type: 'template',
          template: {
            name: payload.templateName,
            language: { code: 'en' },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error?.message || 'Meta Cloud API Error' };
      }
      return { success: true, providerId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async sendTransactional(toPhone: string, text: string) {
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toPhone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: text },
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message };
      return { success: true, providerId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getMessageStatus(providerId: string) {
    return 'delivered' as const;
  }
}

/**
 * Factory to resolve the configured WhatsApp provider without hardwiring business logic.
 */
export async function getWhatsAppProvider(): Promise<WhatsAppProvider> {
  const settings = await getRetentionSettings();
  if (settings.whatsappProvider === 'meta' && settings.whatsappApiKey && settings.whatsappPhoneNumberId) {
    return new MetaWhatsAppCloudProvider(settings.whatsappApiKey, settings.whatsappPhoneNumberId);
  }
  return new MockWhatsAppProvider();
}

/**
 * High-level dispatch checking user consent (separating transactional vs marketing consent).
 */
export async function dispatchWhatsAppNotification(params: {
  toPhone: string;
  templateName: string;
  parameters: Record<string, string>;
  isMarketing?: boolean;
  userMarketingConsent?: boolean;
}) {
  const settings = await getRetentionSettings();
  if (!settings.whatsappEnabled) {
    return { success: false, error: 'WhatsApp notifications are disabled in settings' };
  }

  // Obey customer marketing consent strictly
  if (params.isMarketing && !params.userMarketingConsent) {
    return { success: false, error: 'User has opted out of WhatsApp marketing messages' };
  }

  const provider = await getWhatsAppProvider();
  const res = await provider.sendTemplate({
    toPhone: params.toPhone,
    templateName: params.templateName,
    parameters: params.parameters,
    isMarketing: params.isMarketing,
  });

  // Log in notification audit table
  await prisma.notificationLog.create({
    data: {
      channel: 'whatsapp',
      recipient: params.toPhone,
      event: params.templateName,
      template: params.templateName,
      status: res.success ? 'sent' : 'failed',
      providerId: res.providerId || null,
      error: res.error || null,
      metadata: {
        parameters: params.parameters,
        isMarketing: Boolean(params.isMarketing),
      },
    },
  });

  return res;
}

