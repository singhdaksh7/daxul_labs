import { MetadataRoute } from 'next';
import { getSiteSettings, getSitemapEntries, POLICY_SLUGS } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://daxullabs.com').replace(/\/+$/, '');

  const settings = await getSiteSettings();
  if (!settings.searchIndexingEnabled) return [];

  const { products, collections, policies } = await getSitemapEntries();
  const now = new Date();

  // Query published CMS pages that are indexable
  let cmsPageRoutes: MetadataRoute.Sitemap = [];
  try {
    const { prisma } = await import('@/lib/db');
    const pages = await prisma.cmsPage.findMany({
      where: { status: 'PUBLISHED', noIndex: false },
      select: { slug: true, updatedAt: true },
    });
    const builtInSlugs = new Set(['home', 'shop', 'collections', 'customize', 'lab', 'about']);
    cmsPageRoutes = pages
      .filter((p) => !builtInSlugs.has(p.slug))
      .map((p) => ({
        url: `${baseUrl}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (e) {
    // Graceful fallback if table is offline
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/customize`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/lab`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const policyDates = new Map(policies.map((p) => [p.slug, p.updatedAt]));
  const policyRoutes: MetadataRoute.Sitemap = POLICY_SLUGS.map((slug) => ({
    url: `${baseUrl}/policies/${slug}`,
    lastModified: policyDates.get(slug) ?? now,
    changeFrequency: 'monthly',
    priority: 0.3,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/shop/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
    url: `${baseUrl}/collections/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...cmsPageRoutes, ...policyRoutes, ...productRoutes, ...collectionRoutes];
}
