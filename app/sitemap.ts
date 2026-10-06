import { MetadataRoute } from 'next';
import { INITIAL_PRODUCTS, INITIAL_COLLECTIONS } from '@/lib/initialData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://daxullabs.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/customize`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/lab`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/policies/shipping`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/policies/return`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/policies/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/policies/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = INITIAL_PRODUCTS.map((prod) => ({
    url: `${baseUrl}/shop/${prod.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = INITIAL_COLLECTIONS.map((col) => ({
    url: `${baseUrl}/collections/${col.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...collectionRoutes];
}
