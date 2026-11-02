/** Pure helpers: Shiprocket status text -> ShipmentTracking.status, and the order pipeline steps it implies. */
import type { OrderStatus, PipelineStatus } from '@/lib/orderPipeline';

export type ShipmentStatus =
  | 'MANIFEST_GENERATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RTO_INITIATED'
  | 'RTO_DELIVERED'
  | 'EXCEPTION'
  | 'CANCELLED';

const RANK: Record<ShipmentStatus, number> = {
  MANIFEST_GENERATED: 0,
  PICKED_UP: 1,
  IN_TRANSIT: 2,
  EXCEPTION: 2.5,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  RTO_INITIATED: 5,
  RTO_DELIVERED: 6,
  CANCELLED: 7,
};

/** Maps Shiprocket's free-text status to ours; null when unrecognised (event is stored, status untouched). */
export function mapShiprocketStatus(raw: unknown): ShipmentStatus | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!s) return null;
  if (s.includes('rto')) {
    if (s.includes('delivered')) return 'RTO_DELIVERED';
    return 'RTO_INITIATED';
  }
  if (s.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
  if (s.includes('undelivered') || s.includes('lost') || s.includes('damaged') || s.includes('ndr') || s.includes('delivery attempt')) {
    return 'EXCEPTION';
  }
  if (s.includes('cancel')) return 'CANCELLED';
  if (s.includes('delivered')) return 'DELIVERED';
  if (s.includes('picked up') || s.includes('pickup done') || s.includes('picked')) return 'PICKED_UP';
  if (s.includes('in transit') || s.includes('shipped') || s.includes('reached') || s.includes('misrouted') || s.includes('transit')) {
    return 'IN_TRANSIT';
  }
  if (s.includes('pickup') || s.includes('awb assigned') || s.includes('manifest') || s.includes('label generated') || s.includes('new')) {
    return 'MANIFEST_GENERATED';
  }
  return null;
}

/** True when moving current -> next is forward progress (statuses never regress; terminal states are final). */
export function shouldAdvance(current: string, next: ShipmentStatus): boolean {
  if (current === 'DELIVERED' || current === 'RTO_DELIVERED' || current === 'CANCELLED') return false;
  const cur = RANK[current as ShipmentStatus];
  if (cur === undefined) return true;
  return RANK[next] > cur;
}

/**
 * Order pipeline steps (through the existing linear pipeline) implied by a shipment status.
 * Only orders already at `packed` (or `shipped`) are moved: earlier stages are never skipped.
 */
export function orderStepsForShipment(orderStatus: OrderStatus | string, shipment: ShipmentStatus): PipelineStatus[] {
  const inMotion = shipment === 'PICKED_UP' || shipment === 'IN_TRANSIT' || shipment === 'OUT_FOR_DELIVERY';
  if (orderStatus === 'packed') {
    if (inMotion) return ['shipped'];
    if (shipment === 'DELIVERED') return ['shipped', 'delivered'];
  }
  if (orderStatus === 'shipped' && shipment === 'DELIVERED') return ['delivered'];
  return [];
}
