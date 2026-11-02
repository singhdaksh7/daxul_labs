import { NextResponse } from 'next/server';
import { guardAdmin, serverError } from '@/lib/adminApi';
import { hasPermission } from '@/lib/operations/rbac';
import { isShiprocketConfigured } from '@/lib/shiprocket/client';
import { ensureShiprocketSettings } from '@/lib/shiprocket/settings';
import { getOrderCourierOptions, ShipmentError } from '@/lib/shiprocket/service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  if (!hasPermission(g.session.user as never, 'orders.read')) {
    return NextResponse.json({ error: 'Forbidden: orders.read permission required' }, { status: 403 });
  }
  await ensureShiprocketSettings();
  if (!isShiprocketConfigured()) return NextResponse.json({ error: 'Shiprocket not configured' }, { status: 503 });
  const orderId = new URL(req.url).searchParams.get('orderId') ?? '';
  if (!orderId || orderId.length > 64) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  try {
    const couriers = await getOrderCourierOptions(orderId);
    return NextResponse.json({ success: true, couriers });
  } catch (e) {
    if (e instanceof ShipmentError) return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    return serverError(e, 'Shiprocket rates error:');
  }
}
