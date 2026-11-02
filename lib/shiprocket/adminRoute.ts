import { NextResponse } from 'next/server';
import { z, type ZodType } from 'zod';
import { guardAdmin, logAdminAction, parseBody, serverError } from '@/lib/adminApi';
import { hasPermission } from '@/lib/operations/rbac';
import { isShiprocketConfigured } from './client';
import { ShipmentError } from './service';
import { ensureShiprocketSettings } from './settings';

export const orderIdSchema = z.object({ orderId: z.string().min(1).max(64) });

/**
 * Shared wrapper for POST /api/admin/shiprocket/*: admin session + same-origin + orders.update permission +
 * zod body + "not configured" short-circuit + audit log + safe error mapping.
 */
export async function adminShiprocketPost<T extends { orderId: string }>(
  req: Request,
  schema: ZodType<T>,
  auditAction: string,
  run: (body: T, admin: { id: string | null; email: string }) => Promise<Record<string, unknown>>,
) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  if (!hasPermission(g.session.user as never, 'orders.update')) {
    return NextResponse.json({ error: 'Forbidden: orders.update permission required' }, { status: 403 });
  }
  await ensureShiprocketSettings();
  if (!isShiprocketConfigured()) return NextResponse.json({ error: 'Shiprocket not configured' }, { status: 503 });
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await run(parsed.data, g.admin);
    await logAdminAction(g.admin, auditAction, 'Order', parsed.data.orderId, result.audit as Record<string, unknown> | undefined);
    const { audit: _audit, ...rest } = result;
    return NextResponse.json({ success: true, ...rest });
  } catch (e) {
    if (e instanceof ShipmentError) return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    return serverError(e, `Shiprocket admin ${auditAction} error:`);
  }
}
