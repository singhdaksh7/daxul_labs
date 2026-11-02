import { z } from 'zod';
import { adminShiprocketPost } from '@/lib/shiprocket/adminRoute';
import { assignAwbForOrder } from '@/lib/shiprocket/service';

export const dynamic = 'force-dynamic';

const schema = z.object({ orderId: z.string().min(1).max(64), courierId: z.number().int().positive().optional() });

export async function POST(req: Request) {
  return adminShiprocketPost(req, schema, 'SHIPROCKET_ASSIGN_AWB', async ({ orderId, courierId }, admin) => {
    const { shipment, assigned } = await assignAwbForOrder(orderId, courierId, admin);
    return { shipment, assigned, audit: { awb: shipment.awbNumber, courier: shipment.courierName, assigned } };
  });
}
