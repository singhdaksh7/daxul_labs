import { prisma } from '@/lib/db';

export interface OperationsSettingsData {
  id: string;
  rawMaterialsEnabled: boolean;
  bomEnabled: boolean;
  purchasingEnabled: boolean;
  courierIntegrationEnabled: boolean;
  advancedCostingEnabled: boolean;
  staffRbacEnabled: boolean;
  courierProvider: string;
  shiprocketApiKey?: string | null;
  shiprocketApiSecret?: string | null;
  kwhElectricityRate: number;
  standardHourlyLaborRate: number;
  poApprovalThreshold: number;
  targetGrossMarginPercent: number;
}

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettingsData = {
  id: 'default',
  rawMaterialsEnabled: false,
  bomEnabled: false,
  purchasingEnabled: false,
  courierIntegrationEnabled: false,
  advancedCostingEnabled: false,
  staffRbacEnabled: false,
  courierProvider: 'manual',
  shiprocketApiKey: null,
  shiprocketApiSecret: null,
  kwhElectricityRate: 8.5,
  standardHourlyLaborRate: 150.0,
  poApprovalThreshold: 25000.0,
  targetGrossMarginPercent: 65.0,
};

export async function getOperationsSettings(): Promise<OperationsSettingsData> {
  try {
    const s = await prisma.operationsSettings.findUnique({
      where: { id: 'default' },
    });
    if (!s) {
      return DEFAULT_OPERATIONS_SETTINGS;
    }
    return {
      ...DEFAULT_OPERATIONS_SETTINGS,
      ...s,
    };
  } catch (err) {
    console.error('getOperationsSettings lookup failed, using defaults:', err);
    return DEFAULT_OPERATIONS_SETTINGS;
  }
}

