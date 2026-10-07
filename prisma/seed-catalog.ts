/**
 * Idempotent catalog seed. NOT run automatically (not part of build/start/seed).
 *
 * Inserts the legacy mock products/collections from lib/initialData.ts as
 * DRAFTS so the owner can review, edit and publish them from the admin panel:
 *   - Product:    isArchived = true,  isActive = false
 *   - Collection: isActive   = false  (the Collection table has no archive flag)
 * Rows whose slug already exists are skipped (never updated), so it is safe to
 * run repeatedly. Legacy finishes / colors / sizes become variant groups
 * (Finish / Light / Size) with 0 price adjustment; mock custom fields become
 * CustomField rows. Mock business costs are carried over (admin-only data).
 *
 * Run manually, against the intended database only:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed-catalog.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { INITIAL_COLLECTIONS, INITIAL_PRODUCTS } from '../lib/initialData';

const prisma = new PrismaClient();

// Mock product category -> mock collection slug
const CATEGORY_TO_COLLECTION_SLUG: Record<string, string> = {
  'Shadow Objects': 'shadow-objects',
  Couples: 'personalized-couples',
  Devotional: 'devotional-altars',
  Keychains: 'custom-keychains',
  'Desk Objects': 'desk-objects',
  Collectibles: 'collectibles-kinetic',
};

async function main() {
  console.log('Seeding draft catalog (idempotent)...');

  // ---- Collections ----
  const collectionIdBySlug = new Map<string, string>();
  let createdCollections = 0;
  for (let i = 0; i < INITIAL_COLLECTIONS.length; i++) {
    const c = INITIAL_COLLECTIONS[i];
    const existing = await prisma.collection.findUnique({ where: { slug: c.slug } });
    if (existing) {
      collectionIdBySlug.set(c.slug, existing.id);
      continue;
    }
    const row = await prisma.collection.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        badge: c.badge ?? null,
        featured: c.featured,
        order: i,
        isActive: false, // draft
      },
    });
    collectionIdBySlug.set(c.slug, row.id);
    createdCollections++;
  }

  // ---- Products ----
  let createdProducts = 0;
  let skippedProducts = 0;
  for (const p of INITIAL_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      skippedProducts++;
      continue;
    }

    const groups: { name: string; options: string[] }[] = [
      { name: 'Finish', options: p.finishes },
      { name: 'Light', options: p.colors },
      { name: 'Size', options: p.sizes },
    ].filter((g) => g.options.length > 0);

    const collectionSlug = CATEGORY_TO_COLLECTION_SLUG[p.category];
    const collectionId = collectionSlug ? collectionIdBySlug.get(collectionSlug) ?? null : null;

    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        description: p.description,
        story: p.story,
        specs: p.specs as unknown as Prisma.InputJsonValue,
        careInstructions: p.careInstructions,
        faq: p.faq as unknown as Prisma.InputJsonValue,
        images: p.images,
        videoUrl: p.videoUrl ?? null,
        badge: p.badge ?? null,
        stock: p.stock,
        productionTimeDays: p.productionTimeDays,
        estimatedDispatchDays: p.estimatedDispatchDays,
        prepaidOnly: p.prepaidOnly,
        codEnabled: p.codEnabled,
        finishes: p.finishes,
        colors: p.colors,
        sizes: p.sizes,
        businessCosts: p.businessCosts as unknown as Prisma.InputJsonValue,
        isFeatured: p.isFeatured ?? false,
        customizable: p.customFields.length > 0,
        collectionId,
        // Draft: hidden from the storefront until published in admin.
        isArchived: true,
        isActive: false,
        customFields: {
          create: p.customFields.map((f, idx) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            options: f.options ?? [],
            fee: f.fee,
            placeholder: f.placeholder ?? null,
            helpText: f.helpText ?? null,
            order: idx,
            isActive: true,
          })),
        },
        variantGroups: {
          create: groups.map((g, gi) => ({
            name: g.name,
            sortOrder: gi,
            variants: {
              create: g.options.map((name, vi) => ({
                name,
                priceAdjustment: 0,
                sortOrder: vi,
                isActive: true,
              })),
            },
          })),
        },
      },
    });
    createdProducts++;
  }

  console.log(
    `Done. Collections created: ${createdCollections}. Products created: ${createdProducts}, skipped (slug exists): ${skippedProducts}.`
  );
  console.log('All seeded rows are drafts: publish them from the admin panel.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
