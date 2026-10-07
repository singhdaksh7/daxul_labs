import { request as pwRequest } from '@playwright/test';
import fs from 'node:fs';
import {
  AUTH_DIR,
  AUTH_FILE,
  ORIGINAL_FILE,
  RUN_FILE,
  STATE_DIR,
  STATE_FILE,
  adminEmail,
  adminPassword,
  baseUrl,
  ensureDir,
  redact,
  requireEnv,
  stripVolatile,
  type Original,
  type QaState,
} from './helpers';

/**
 * 1. Validates env.  2. Logs in through the NextAuth credentials endpoint (no browser,
 * nothing recorded) and stores the session in e2e/.auth/.  3. Creates the run tag.
 * 4. Captures the ORIGINAL settings/policies/theme/SEO/CMS/collections into
 * e2e/.state/original.json so specs can restore and 15-cleanup can assert equality.
 *
 * QA_RESUME=1 re-uses the existing run tag, state and originals (use it to re-run
 * 15-cleanup after an aborted run).
 */
export default async function globalSetup(): Promise<void> {
  requireEnv();
  const resume = process.env.QA_RESUME === '1';
  ensureDir(AUTH_DIR);
  ensureDir(STATE_DIR);

  if (!resume && fs.existsSync(STATE_FILE)) {
    const prev = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as QaState;
    if (!prev.cleaned) {
      throw new Error(
        'A previous QA run did not finish cleanup (e2e/.state/state.json, cleaned!=true). ' +
          'Run `QA_RESUME=1 npx playwright test -c e2e/playwright.config.ts 15-cleanup` first, or delete e2e/.state if you are sure nothing is left behind.',
      );
    }
  }

  // ---- login (API, no browser) ----
  const ctx = await pwRequest.newContext({ baseURL: baseUrl() });
  try {
    const csrfRes = await ctx.get('/api/auth/csrf');
    if (!csrfRes.ok()) throw new Error(`GET /api/auth/csrf -> ${csrfRes.status()}`);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const res = await ctx.post('/api/auth/callback/credentials', {
      form: { csrfToken, email: adminEmail(), password: adminPassword(), json: 'true', callbackUrl: `${baseUrl()}/admin` },
    });
    if (!res.ok()) throw new Error(`credentials callback -> ${res.status()}`);
    const sess = await ctx.get('/api/auth/session');
    const s = (await sess.json().catch(() => ({}))) as { user?: { role?: string } };
    if (!s.user || !['ADMIN', 'SUPER_ADMIN'].includes(String(s.user.role))) {
      throw new Error('Login did not produce an ADMIN session (wrong credentials, locked out, or role not ADMIN).');
    }
    await ctx.storageState({ path: AUTH_FILE });

    // ---- run tag ----
    if (!(resume && fs.existsSync(RUN_FILE))) {
      const tag = `QA-${Date.now()}`;
      fs.writeFileSync(RUN_FILE, JSON.stringify({ tag }));
      const state: QaState = { tag, coupons: [], collections: [], mediaAlt: [] };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    }

    // ---- originals ----
    if (!(resume && fs.existsSync(ORIGINAL_FILE))) {
      const j = async (url: string) => {
        const r = await ctx.get(url);
        if (!r.ok()) throw new Error(`capture ${url} -> ${r.status()}`);
        return (await r.json()) as any;
      };
      const [settings, policies, theme, seo, published, sections, collections, coupons, products, media] = await Promise.all([
        j('/api/admin/settings'),
        j('/api/admin/policies'),
        j('/api/admin/theme'),
        j('/api/admin/seo'),
        j('/api/cms/published'),
        j('/api/admin/cms/sections'),
        j('/api/admin/collections'),
        j('/api/admin/coupons'),
        j('/api/admin/products?status=all'),
        j('/api/admin/cms/media'),
      ]);
      const original: Original = {
        capturedAt: new Date().toISOString(),
        settings: stripVolatile(settings.settings),
        policies: (policies.policies as any[]).map((p) => ({ slug: p.slug, title: p.title, content: p.content })),
        theme: stripVolatile(theme.theme),
        seo: stripVolatile(seo.seo),
        cmsPublished: published,
        cmsSections: (sections.sections as any[]).map((s) => ({
          sectionKey: s.sectionKey,
          visible: s.visible,
          sortOrder: s.sortOrder,
          draftContent: s.draftContent,
          publishedContent: s.publishedContent,
        })),
        collections: (collections.collections as any[]).map((c) => ({ id: c.id, name: c.name, isActive: c.isActive })),
        couponIds: (coupons.coupons as any[]).map((c) => c.id),
        productIds: (products.products as any[]).map((p) => p.id),
        mediaIds: ((media.assets as any[]) ?? []).map((a) => a.id),
      };
      fs.writeFileSync(ORIGINAL_FILE, JSON.stringify(original, null, 2));
    }
  } catch (e) {
    throw new Error(redact(e instanceof Error ? e.message : String(e)));
  } finally {
    await ctx.dispose();
  }
  const em = adminEmail();
  console.log(`[qa] global setup OK; admin session stored; run tag ${JSON.parse(fs.readFileSync(RUN_FILE, 'utf8')).tag}; user ${em.slice(0, 8)}***`);
}
