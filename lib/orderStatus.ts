import type { ManufacturingStatus } from './types';

/** Customer-facing labels for manufacturing statuses (client-safe, no DB). */
export const ORDER_STATUS_LABELS: Record<ManufacturingStatus, string> = {
  new: 'Order Placed',
  design_pending: 'Design Pending',
  design_approved: 'Design Approved',
  printing: '3D Printing',
  finishing: 'Hand Finishing',
  qc: 'Quality Control',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STAGES: ManufacturingStatus[] = [
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
