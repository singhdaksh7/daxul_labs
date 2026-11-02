import { adminShiprocketPost, orderIdSchema } from '@/lib/shiprocket/adminRoute';
import { cancelShipmentForOrder } from '@/lib/shiprocket/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return adminShiprocketPost(req, orderIdSchema, 'SHIPROCKET_CANCEL_SHIPMENT', async ({ orderId }, admin) => {
    await cancelShipmentForOrder(orderId, admin);
    return { cancelled: true };
  });
}
