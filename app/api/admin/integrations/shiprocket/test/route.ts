import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, logAdminAction, parseBody } from '@/lib/adminApi';
import { ShiprocketClient, ShiprocketError, getShiprocketConfig } from '@/lib/shiprocket/client';
import { ensureShiprocketSettings } from '@/lib/shiprocket/settings';

export const dynamic = 'force-dynamic';

const schema = z.object({
  // Optional: test values typed in the form before saving. Blank = use what is saved.
  email: z.string().trim().max(200).optional(),
  password: z.string().max(200).optional(),
});

/** POST /api/admin/integrations/shiprocket/test: logs in to Shiprocket once. SUPER_ADMIN only. */
export async function POST(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  if ((g.session.user as { role?: string } | undefined)?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN required' }, { status: 403 });
  }
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;

  await ensureShiprocketSettings(true);
  const saved = getShiprocketConfig();
  const email = parsed.data.email || saved?.email;
  const password = parsed.data.password || saved?.password;
  if (!email || !password) {
    return NextResponse.json({ ok: false, message: 'Enter the Shiprocket API email and password first.' });
  }
  try {
    await new ShiprocketClient({ email, password }).verifyCredentials();
    await logAdminAction(g.admin, 'SHIPROCKET_CONNECTION_TESTED', 'IntegrationSetting', 'shiprocket', { ok: true });
    return NextResponse.json({ ok: true, message: 'Connected to Shiprocket successfully.' });
  } catch (err) {
    await logAdminAction(g.admin, 'SHIPROCKET_CONNECTION_TESTED', 'IntegrationSetting', 'shiprocket', { ok: false });
    const message =
      err instanceof ShiprocketError && err.kind === 'auth'
        ? 'Shiprocket rejected these credentials. Use the API user email/password created under Settings > API, not your normal login.'
        : 'Could not reach Shiprocket. Check your internet connection and try again.';
    return NextResponse.json({ ok: false, message });
  }
}
