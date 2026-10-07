// Pure helpers (safe for client + server) describing the manufacturing pipeline.
export type PipelineStatus =
  | 'new'
  | 'design_pending'
  | 'design_approved'
  | 'printing'
  | 'finishing'
  | 'qc'
  | 'packed'
  | 'shipped'
  | 'delivered';
export type OrderStatus = PipelineStatus | 'cancelled';

export const PIPELINE: PipelineStatus[] = [
  'new',
  'design_pending',
  'design_approved',
  'printing',
  'finishing',
  'qc',
  'packed',
  'shipped',
  'delivered',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'NEW ORDER',
  design_pending: 'DESIGN PENDING',
  design_approved: 'DESIGN APPROVED',
  printing: '3D PRINTING',
  finishing: 'HAND FINISHING',
  qc: 'QC CHECKED',
  packed: 'PACKED',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
};

export function nextStatus(s: OrderStatus): PipelineStatus | null {
  const i = PIPELINE.indexOf(s as PipelineStatus);
  if (i < 0 || i >= PIPELINE.length - 1) return null;
  return PIPELINE[i + 1];
}

export function prevStatus(s: OrderStatus): PipelineStatus | null {
  const i = PIPELINE.indexOf(s as PipelineStatus);
  if (i <= 0) return null;
  return PIPELINE[i - 1];
}

export function canCancel(s: OrderStatus) {
  return s !== 'delivered' && s !== 'cancelled';
}

export function isSafeHttpsUrl(v: string): boolean {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}

export const ORDER_FILTERS = [
  'all',
  'new',
  'paid',
  'cod',
  'custom',
  'design_pending',
  'printing',
  'finishing',
  'qc',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];
