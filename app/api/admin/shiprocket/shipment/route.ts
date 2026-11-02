import { adminShiprocketPost, orderIdSchema } from '@/lib/shiprocket/adminRoute';
import { createShipmentForOrder } from '@/lib/shiprocket/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return adminShiprocketPost(req, orderIdSchema, 'SHIPROCKET_CREATE_SHIPMENT', async ({ orderId }, admin) => {
    const { shipment, created } = await createShipmentForOrder(orderId, admin);
    return { shipment, created, audit: { created, shipmentId: shipment.shipmentId } };
  });
}
