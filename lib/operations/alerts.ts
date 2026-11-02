import { prisma } from '@/lib/db';

export type AlertType =
  | 'LOW_FILAMENT'
  | 'LOW_COMPONENT'
  | 'LOW_PACKAGING'
  | 'PRINTER_MAINTENANCE'
  | 'FAILED_PRINT'
  | 'QC_FAILURE'
  | 'ORDER_AT_RISK'
  | 'ORDER_OVERDUE'
  | 'MATERIAL_SHORTAGE'
  | 'PAYMENT_MISMATCH'
  | 'RTO'
  | 'PICKUP_FAILURE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CreateAlertParams {
  type: AlertType;
  severity?: AlertSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates an operational alert if not already open for the same entity and type.
 */
export async function createOperationalAlert(params: CreateAlertParams) {
  if (params.entityType && params.entityId) {
    const existing = await prisma.operationalAlert.findFirst({
      where: {
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        status: 'OPEN',
      },
    });
    if (existing) return existing;
  }

  return await prisma.operationalAlert.create({
    data: {
      type: params.type,
      severity: params.severity || 'WARNING',
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
      assignedTo: params.assignedTo,
      metadata: params.metadata || {},
    },
  });
}

/**
 * Scans shopfloor telemetry and raises automated alerts.
 */
export async function scanOperationalAlerts() {
  const alertsCreated = [];

  // 1. Low Spool Filament Check
  const lowSpools = await prisma.filamentSpool.findMany({
    where: { currentWeightGrams: { lte: 100 }, status: { notIn: ['EMPTY', 'ARCHIVED'] } },
  });
  for (const s of lowSpools) {
    const a = await createOperationalAlert({
      type: 'LOW_FILAMENT',
      severity: s.currentWeightGrams <= 50 ? 'CRITICAL' : 'WARNING',
      title: `Low Filament: Spool ${s.spoolNumber}`,
      message: `${s.brand} ${s.colorName} ${s.materialType} has only ${s.currentWeightGrams}g remaining.`,
      entityType: 'FilamentSpool',
      entityId: s.id,
    });
    alertsCreated.push(a);
  }

  // 2. Low Material Stock (Packaging & Components)
  const lowMaterials = await prisma.materialItem.findMany({
    where: { currentQuantity: { lte: prisma.materialItem.fields.reorderPoint } },
  });
  for (const m of lowMaterials) {
    const a = await createOperationalAlert({
      type: m.category === 'PACKAGING' ? 'LOW_PACKAGING' : 'LOW_COMPONENT',
      severity: m.currentQuantity <= 0 ? 'CRITICAL' : 'WARNING',
      title: `Low Stock: ${m.name}`,
      message: `Current stock (${m.currentQuantity} ${m.unit}) is below reorder threshold (${m.reorderPoint} ${m.unit}).`,
      entityType: 'MaterialItem',
      entityId: m.id,
    });
    alertsCreated.push(a);
  }

  return alertsCreated;
}

