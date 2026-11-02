import { adminShiprocketPost, orderIdSchema } from '@/lib/shiprocket/adminRoute';
import { schedulePickupForOrder } from '@/lib/shiprocket/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return adminShiprocketPost(req, orderIdSchema, 'SHIPROCKET_SCHEDULE_PICKUP', async ({ orderId }, admin) => {
    const { shipment } = await schedulePickupForOrder(orderId, admin);
    return { shipment, audit: { awb: shipment.awbNumber } };
  });
}
