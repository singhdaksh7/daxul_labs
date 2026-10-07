import { prisma } from '@/lib/db';

export interface MediaUsage {
  kind: 'homepage_section' | 'product' | 'collection' | 'site_settings';
  id: string;
  label: string;
  field: string;
}

/**
 * Best-effort reference scan for a stored filename (random hex name, so a plain
 * substring match on URLs is reliable). Searches HomepageSection JSON, product
 * and collection media fields and the default OG image.
 */
export async function findMediaUsages(filename: string): Promise<MediaUsage[]> {
  const usages: MediaUsage[] = [];
  const has = (v: unknown) => typeof v === 'string' && v.includes(filename);

  const [sections, products, collections, settings] = await Promise.all([
    prisma.homepageSection.findMany({
      select: { id: true, sectionKey: true, name: true, draftContent: true, publishedContent: true, draftSettings: true, publishedSettings: true },
    }),
    prisma.product.findMany({ select: { id: true, name: true, images: true, videoUrl: true, ogImage: true } }),
    prisma.collection.findMany({ select: { id: true, name: true, image: true, heroMedia: true, ogImage: true } }),
    prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { defaultOgImage: true } }),
  ]);

  for (const s of sections) {
    for (const field of ['draftContent', 'publishedContent', 'draftSettings', 'publishedSettings'] as const) {
      if (s[field] != null && JSON.stringify(s[field]).includes(filename)) {
        usages.push({ kind: 'homepage_section', id: s.id, label: s.name || s.sectionKey, field });
      }
    }
  }
  for (const p of products) {
    if (p.images.some((i) => has(i))) usages.push({ kind: 'product', id: p.id, label: p.name, field: 'images' });
    if (has(p.videoUrl)) usages.push({ kind: 'product', id: p.id, label: p.name, field: 'videoUrl' });
    if (has(p.ogImage)) usages.push({ kind: 'product', id: p.id, label: p.name, field: 'ogImage' });
  }
  for (const c of collections) {
    if (has(c.image)) usages.push({ kind: 'collection', id: c.id, label: c.name, field: 'image' });
    if (has(c.heroMedia)) usages.push({ kind: 'collection', id: c.id, label: c.name, field: 'heroMedia' });
    if (has(c.ogImage)) usages.push({ kind: 'collection', id: c.id, label: c.name, field: 'ogImage' });
  }
  if (has(settings?.defaultOgImage)) {
    usages.push({ kind: 'site_settings', id: 'default', label: 'Default OG image', field: 'defaultOgImage' });
  }
  return usages;
}
