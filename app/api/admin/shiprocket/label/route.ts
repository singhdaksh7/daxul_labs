import { adminShiprocketPost, orderIdSchema } from '@/lib/shiprocket/adminRoute';
import { labelForOrder } from '@/lib/shiprocket/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return adminShiprocketPost(req, orderIdSchema, 'SHIPROCKET_LABEL', async ({ orderId }) => {
    const { labelUrl } = await labelForOrder(orderId);
    return { labelUrl };
  });
}
