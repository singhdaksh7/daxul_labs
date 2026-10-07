import { prisma } from '@/lib/db';
import { sanitizeMarkdown } from '@/lib/safeMarkdown';

export const POLICY_SLUGS = ['shipping', 'returns', 'cancellation', 'privacy', 'terms'] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

export const POLICY_META: Record<PolicySlug, { title: string; legacyField: string }> = {
  shipping: { title: 'Shipping Policy', legacyField: 'shippingPolicyText' },
  returns: { title: 'Returns & Refunds Policy', legacyField: 'returnPolicyText' },
  cancellation: { title: 'Cancellation Policy', legacyField: 'cancellationPolicyText' },
  privacy: { title: 'Privacy Policy', legacyField: 'privacyPolicyText' },
  terms: { title: 'Terms & Conditions', legacyField: 'termsConditionsText' },
};

export function isPolicySlug(s: string): s is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(s);
}

/**
 * Seed-on-read: any missing StorePolicy row is created from the legacy
 * SiteSettings text field. Existing rows are never overwritten
 * (createMany + skipDuplicates). Returns all five policies in canonical order.
 */
export async function getPoliciesSeeded() {
  const existing = await prisma.storePolicy.findMany({ where: { slug: { in: [...POLICY_SLUGS] } } });
  const have = new Set(existing.map((p) => p.slug));
  const missing = POLICY_SLUGS.filter((s) => !have.has(s));

  if (missing.length > 0) {
    const settings = (await prisma.siteSettings.findUnique({ where: { id: 'default' } })) as Record<string, unknown> | null;
    await prisma.storePolicy.createMany({
      data: missing.map((slug) => {
        const legacy = settings?.[POLICY_META[slug].legacyField];
        return {
          slug,
          title: POLICY_META[slug].title,
          content: sanitizeMarkdown(typeof legacy === 'string' ? legacy : '').clean,
        };
      }),
      skipDuplicates: true,
    });
  }

  const rows = await prisma.storePolicy.findMany({ where: { slug: { in: [...POLICY_SLUGS] } } });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return POLICY_SLUGS.map((slug) => bySlug.get(slug)!).filter(Boolean);
}
