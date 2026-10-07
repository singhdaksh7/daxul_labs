import { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://daxullabs.com').replace(/\/+$/, '');
  const settings = await getSiteSettings();

  if (!settings.searchIndexingEnabled) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/checkout', '/account'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
