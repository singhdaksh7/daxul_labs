import { prisma } from '@/lib/db';

export interface RetentionSettingsConfig {
  id: string;
  loyaltyEnabled: boolean;
  referralsEnabled: boolean;
  giftCardsEnabled: boolean;
  storeCreditEnabled: boolean;
  whatsappEnabled: boolean;
  winbackEnabled: boolean;

  pointsPer100Rupees: number;
  redemptionValuePerPoint: number;
  minimumRedemptionPoints: number;
  maxOrderRedemptionPercent: number;
  pointExpiryDays: number;
  loyaltyPendingDays: number;
  loyaltyEarningMinOrder: number;
  excludedProductIds: string[];
  excludedCollectionIds: string[];

  referralRewardType: 'points' | 'credit' | 'coupon';
  referralRewardAmount: number;
  referralReferredRewardAmount: number;
  referralMinOrderSpend: number;
  referralQualifyEvent: 'PAID' | 'DELIVERED';

  giftCardExpiryDays: number;
  customGiftCardMin: number;
  customGiftCardMax: number;

  reviewRequestDelayDays: number;
  reviewRewardPoints: number;
  winbackInactivityDays: number;
  winbackDiscountPercent: number;

  whatsappProvider: string;
  whatsappApiKey: string | null;
  whatsappApiUrl: string | null;
  whatsappPhoneNumberId: string | null;
}

export const DEFAULT_RETENTION_SETTINGS: RetentionSettingsConfig = {
  id: 'default',
  loyaltyEnabled: false,
  referralsEnabled: false,
  giftCardsEnabled: false,
  storeCreditEnabled: false,
  whatsappEnabled: false,
  winbackEnabled: false,

  pointsPer100Rupees: 1,
  redemptionValuePerPoint: 1.0,
  minimumRedemptionPoints: 50,
  maxOrderRedemptionPercent: 20.0,
  pointExpiryDays: 365,
  loyaltyPendingDays: 7,
  loyaltyEarningMinOrder: 0,
  excludedProductIds: [],
  excludedCollectionIds: [],

  referralRewardType: 'points',
  referralRewardAmount: 200,
  referralReferredRewardAmount: 100,
  referralMinOrderSpend: 999,
  referralQualifyEvent: 'DELIVERED',

  giftCardExpiryDays: 365,
  customGiftCardMin: 500,
  customGiftCardMax: 50000,

  reviewRequestDelayDays: 5,
  reviewRewardPoints: 25,
  winbackInactivityDays: 60,
  winbackDiscountPercent: 15,

  whatsappProvider: 'mock',
  whatsappApiKey: null,
  whatsappApiUrl: null,
  whatsappPhoneNumberId: null,
};

export async function getRetentionSettings(
  client: Pick<typeof prisma, 'retentionSettings'> = prisma,
): Promise<RetentionSettingsConfig> {
  try {
    const row = await client.retentionSettings.findUnique({
      where: { id: 'default' },
    });
    if (!row) {
      return DEFAULT_RETENTION_SETTINGS;
    }
    return {
      ...DEFAULT_RETENTION_SETTINGS,
      ...row,
      referralRewardType: (row.referralRewardType as any) || 'points',
      referralQualifyEvent: (row.referralQualifyEvent as any) || 'DELIVERED',
    };
  } catch (err) {
    console.error('Error fetching retention settings, falling back to defaults:', err);
    return DEFAULT_RETENTION_SETTINGS;
  }
}

