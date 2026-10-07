import { prisma } from './db';
import {
  CmsSectionKey,
  CmsHeaderContent,
  CmsHeroContent,
  CmsFeaturedProductContent,
  CmsCollectionsContent,
  CmsCustomizationContent,
  CmsLabContent,
  CmsBuildingDaxulContent,
  CmsFooterContent,
} from './cmsTypes';
import {
  DEFAULT_HOMEPAGE_SECTIONS_LIST,
  DEFAULT_CMS_HEADER,
  DEFAULT_CMS_HERO,
  DEFAULT_CMS_FEATURED_PRODUCT,
  DEFAULT_CMS_COLLECTIONS,
  DEFAULT_CMS_CUSTOMIZATION,
  DEFAULT_CMS_LAB,
  DEFAULT_CMS_BUILDING_DAXUL,
  DEFAULT_CMS_FOOTER,
} from './cmsDefaults';

/**
 * Ensure initial database records exist for all 8 homepage sections.
 */
let cmsSeeded = false;

export async function ensureCmsSectionsSeeded() {
  if (cmsSeeded) return;
  try {
    // Create only the sections that are missing; never touch existing rows.
    await prisma.homepageSection.createMany({
      data: DEFAULT_HOMEPAGE_SECTIONS_LIST.map((item) => ({
        sectionKey: item.sectionKey,
        sectionType: item.sectionType,
        name: item.name,
        visible: item.visible,
        sortOrder: item.sortOrder,
        draftContent: item.content as any,
        publishedContent: item.content as any,
      })),
      skipDuplicates: true,
    });
    cmsSeeded = true;
  } catch (err) {
    console.error('Failed to seed default CMS sections to database:', err);
  }
}

/**
 * Get all published section contents for storefront rendering.
 */
export async function getPublishedCmsData() {
  await ensureCmsSectionsSeeded();
  try {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const getSection = (key: CmsSectionKey, fallback: any) => {
      const match = sections.find((s) => s.sectionKey === key);
      if (!match || !match.visible) return fallback;
      return match.publishedContent || fallback;
    };

    const isVisible = (key: CmsSectionKey) => {
      const match = sections.find((s) => s.sectionKey === key);
      return match ? match.visible : true;
    };

    return {
      header: getSection('HEADER', DEFAULT_CMS_HEADER) as CmsHeaderContent,
      hero: getSection('HERO', DEFAULT_CMS_HERO) as CmsHeroContent,
      featuredProduct: getSection('FEATURED_PRODUCT', DEFAULT_CMS_FEATURED_PRODUCT) as CmsFeaturedProductContent,
      collections: getSection('COLLECTIONS', DEFAULT_CMS_COLLECTIONS) as CmsCollectionsContent,
      customization: getSection('CUSTOMIZATION', DEFAULT_CMS_CUSTOMIZATION) as CmsCustomizationContent,
      lab: getSection('LAB', DEFAULT_CMS_LAB) as CmsLabContent,
      buildingDaxul: getSection('BUILDING_DAXUL', DEFAULT_CMS_BUILDING_DAXUL) as CmsBuildingDaxulContent,
      footer: getSection('FOOTER', DEFAULT_CMS_FOOTER) as CmsFooterContent,
      visibility: {
        HEADER: isVisible('HEADER'),
        HERO: isVisible('HERO'),
        FEATURED_PRODUCT: isVisible('FEATURED_PRODUCT'),
        COLLECTIONS: isVisible('COLLECTIONS'),
        CUSTOMIZATION: isVisible('CUSTOMIZATION'),
        LAB: isVisible('LAB'),
        BUILDING_DAXUL: isVisible('BUILDING_DAXUL'),
        FOOTER: isVisible('FOOTER'),
      },
      sectionsList: sections.map((s) => ({
        id: s.id,
        sectionKey: s.sectionKey as CmsSectionKey,
        name: s.name,
        visible: s.visible,
        sortOrder: s.sortOrder,
      })),
    };
  } catch (e) {
    console.error('Database connection error in getPublishedCmsData, using default template fallback:', e);
    return {
      header: DEFAULT_CMS_HEADER,
      hero: DEFAULT_CMS_HERO,
      featuredProduct: DEFAULT_CMS_FEATURED_PRODUCT,
      collections: DEFAULT_CMS_COLLECTIONS,
      customization: DEFAULT_CMS_CUSTOMIZATION,
      lab: DEFAULT_CMS_LAB,
      buildingDaxul: DEFAULT_CMS_BUILDING_DAXUL,
      footer: DEFAULT_CMS_FOOTER,
      visibility: {
        HEADER: true,
        HERO: true,
        FEATURED_PRODUCT: true,
        COLLECTIONS: true,
        CUSTOMIZATION: true,
        LAB: true,
        BUILDING_DAXUL: true,
        FOOTER: true,
      },
      sectionsList: DEFAULT_HOMEPAGE_SECTIONS_LIST.map((s, idx) => ({
        id: `default-${s.sectionKey}`,
        sectionKey: s.sectionKey,
        name: s.name,
        visible: true,
        sortOrder: idx + 1,
      })),
    };
  }
}

/**
 * Get all sections draft & published details for Admin Site Editor.
 */
export async function getAdminCmsSections() {
  await ensureCmsSectionsSeeded();
  try {
    const records = await prisma.homepageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return records;
  } catch (err) {
    console.error('Error fetching admin CMS sections:', err);
    return [];
  }
}

/**
 * Save draft content for a section.
 */
export async function updateCmsDraft(
  sectionKey: CmsSectionKey,
  draftContent: any,
  adminEmail?: string
) {
  const updated = await prisma.homepageSection.update({
    where: { sectionKey },
    data: {
      draftContent,
      updatedAt: new Date(),
    },
  });

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey,
      action: 'DRAFT_SAVED',
      details: { timestamp: new Date().toISOString() },
    },
  });

  return updated;
}

/**
 * Publish a draft section into publishedContent.
 */
export async function publishCmsSection(sectionKey: CmsSectionKey, adminEmail?: string) {
  const target = await prisma.homepageSection.findUnique({
    where: { sectionKey },
  });

  if (!target) throw new Error(`Section ${sectionKey} not found`);

  const updated = await prisma.homepageSection.update({
    where: { sectionKey },
    data: {
      publishedContent: target.draftContent as any,
      updatedAt: new Date(),
    },
  });

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey,
      action: 'SECTION_PUBLISHED',
      details: { timestamp: new Date().toISOString() },
    },
  });

  return updated;
}

/**
 * Publish all draft sections into publishedContent transactionally.
 */
export async function publishAllCmsSections(adminEmail?: string) {
  const sections = await prisma.homepageSection.findMany();

  const updates = sections.map((sec) =>
    prisma.homepageSection.update({
      where: { id: sec.id },
      data: {
        publishedContent: sec.draftContent as any,
        updatedAt: new Date(),
      },
    })
  );

  await prisma.$transaction(updates);

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey: 'ALL',
      action: 'ALL_PUBLISHED',
      details: { timestamp: new Date().toISOString(), count: sections.length },
    },
  });

  return { success: true, count: sections.length };
}

/**
 * Revert draft content back to published content for a section.
 */
export async function revertCmsDraft(sectionKey: CmsSectionKey, adminEmail?: string) {
  const target = await prisma.homepageSection.findUnique({
    where: { sectionKey },
  });
  if (!target) throw new Error(`Section ${sectionKey} not found`);

  const updated = await prisma.homepageSection.update({
    where: { sectionKey },
    data: {
      draftContent: target.publishedContent as any,
      updatedAt: new Date(),
    },
  });

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey,
      action: 'DRAFT_REVERTED',
      details: { timestamp: new Date().toISOString() },
    },
  });

  return updated;
}

/**
 * Reset a section draft & published to standard DAXUL default template.
 */
export async function resetCmsSectionToDefault(sectionKey: CmsSectionKey, adminEmail?: string) {
  const defaultObj = DEFAULT_HOMEPAGE_SECTIONS_LIST.find((s) => s.sectionKey === sectionKey);
  if (!defaultObj) throw new Error(`Default for ${sectionKey} not found`);

  const updated = await prisma.homepageSection.update({
    where: { sectionKey },
    data: {
      draftContent: defaultObj.content as any,
      publishedContent: defaultObj.content as any,
      visible: true,
      updatedAt: new Date(),
    },
  });

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey,
      action: 'SECTION_RESET_DEFAULT',
      details: { timestamp: new Date().toISOString() },
    },
  });

  return updated;
}

/**
 * Reset all sections to standard DAXUL default templates.
 */
export async function resetAllCmsSectionsToDefault(adminEmail?: string) {
  for (const item of DEFAULT_HOMEPAGE_SECTIONS_LIST) {
    await prisma.homepageSection.upsert({
      where: { sectionKey: item.sectionKey },
      update: {
        draftContent: item.content as any,
        publishedContent: item.content as any,
        visible: true,
        sortOrder: item.sortOrder,
      },
      create: {
        sectionKey: item.sectionKey,
        sectionType: item.sectionType,
        name: item.name,
        visible: true,
        sortOrder: item.sortOrder,
        draftContent: item.content as any,
        publishedContent: item.content as any,
      },
    });
  }

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey: 'ALL',
      action: 'ALL_RESET_DEFAULT',
      details: { timestamp: new Date().toISOString() },
    },
  });

  return { success: true };
}

/**
 * Reorder sections.
 */
export async function reorderCmsSections(orderedKeys: CmsSectionKey[], adminEmail?: string) {
  const updates = orderedKeys.map((key, index) =>
    prisma.homepageSection.update({
      where: { sectionKey: key },
      data: { sortOrder: index + 1 },
    })
  );

  await prisma.$transaction(updates);

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey: 'ALL',
      action: 'SECTIONS_REORDERED',
      details: { order: orderedKeys },
    },
  });

  return { success: true };
}

/**
 * Toggle visibility of a section.
 */
export async function toggleCmsSectionVisibility(sectionKey: CmsSectionKey, adminEmail?: string) {
  const target = await prisma.homepageSection.findUnique({
    where: { sectionKey },
  });
  if (!target) throw new Error(`Section ${sectionKey} not found`);

  const updated = await prisma.homepageSection.update({
    where: { sectionKey },
    data: { visible: !target.visible },
  });

  await prisma.cmsAuditLog.create({
    data: {
      adminEmail: adminEmail || 'admin@daxullabs.com',
      sectionKey,
      action: updated.visible ? 'SECTION_SHOWN' : 'SECTION_HIDDEN',
      details: { visible: updated.visible },
    },
  });

  return updated;
}
