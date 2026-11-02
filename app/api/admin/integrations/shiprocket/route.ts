import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, logAdminAction, parseBody, serverError } from '@/lib/adminApi';
import { getShiprocketSettingsView, saveShiprocketSettings } from '@/lib/shiprocket/settings';

export const dynamic = 'force-dynamic';

/**
 * Shiprocket credentials + defaults, editable from the admin panel. SUPER_ADMIN only.
 * Secrets (password, webhook token) are encrypted at rest and only ever returned masked.
 * Send a secret field only when changing it; omit/empty-undefined keeps the saved one.
 * Send "" or null to clear a field (falls back to the server env var, if any).
 */
const isSuper = (session: { user?: unknown }) => (session.user as { role?: string } | undefined)?.role === 'SUPER_ADMIN';

const optText = (max: number) => z.string().trim().max(max).nullable().optional();
const optNum = z.union([z.number().positive().max(100000), z.literal(''), z.null()]).optional();

const schema = z.object({
  email: z.union([z.string().trim().email().max(200), z.literal(''), z.null()]).optional(),
  password: optText(200),
  webhookToken: optText(200),
  pickupLocation: optText(100),
  pickupPincode: z.union([z.string().trim().regex(/^\d{6}$/, 'Pickup pincode must be 6 digits'), z.literal(''), z.null()]).optional(),
  defaultWeightGrams: optNum,
  lengthCm: optNum,
  breadthCm: optNum,
  heightCm: optNum,
  enabled: z.boolean().optional(),
});

export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  if (!isSuper(g.session)) return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required' }, { status: 403 });
  try {
    return NextResponse.json(await getShiprocketSettingsView(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return serverError(err, 'GET /api/admin/integrations/shiprocket');
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  if (!isSuper(g.session)) return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required' }, { status: 403 });
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const input = { ...parsed.data } as Record<string, string | number | boolean | null | undefined>;
    // A blank secret box means "keep what is saved", never "wipe it".
    if (input.password === '' || input.password === null) delete input.password;
    if (input.webhookToken === '' || input.webhookToken === null) delete input.webhookToken;
    await saveShiprocketSettings(input, g.admin.email);
    // Audit only WHICH fields changed, never values.
    await logAdminAction(g.admin, 'SHIPROCKET_SETTINGS_UPDATED', 'IntegrationSetting', 'shiprocket', {
      fields: Object.keys(parsed.data).filter((k) => (parsed.data as Record<string, unknown>)[k] !== undefined),
    });
    return NextResponse.json({ success: true, ...(await getShiprocketSettingsView()) });
  } catch (err) {
    return serverError(err, 'PUT /api/admin/integrations/shiprocket');
  }
}
