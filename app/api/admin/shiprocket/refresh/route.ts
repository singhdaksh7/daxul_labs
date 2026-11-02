import { adminShiprocketPost, orderIdSchema } from '@/lib/shiprocket/adminRoute';
import { findActiveShipment, refreshTrackingForAwb, ShipmentError } from '@/lib/shiprocket/service';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return adminShiprocketPost(req, orderIdSchema, 'SHIPROCKET_REFRESH_TRACKING', async ({ orderId }) => {
    const s = await findActiveShipment(prisma, orderId);
    if (!s?.awbNumber) throw new ShipmentError('No AWB assigned yet', 400);
    const t = await refreshTrackingForAwb(s.awbNumber);
    return { currentStatus: t.currentStatus, events: t.events.length };
  });
}
