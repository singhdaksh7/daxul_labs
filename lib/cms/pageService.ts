import prisma from '@/lib/db';
import { PageSectionType, AnySectionContent } from './pageTypes';

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'shop',
  'checkout',
  'cart',
  'account',
  'track',
  'login',
  'auth',
  'collections',
  'policies',
  'search',
  'sitemap',
  'robots',
  'favicon.ico',
  'manifest',
]);

export function normalizeSlug(raw: string): string {
  let s = raw.trim().toLowerCase();
  // Strip leading and trailing slashes
  s = s.replace(/^\/+|\/+$/g, '');
  // Replace spaces and special characters with dash, allowing internal single slashes for nested slugs
  s = s.replace(/[^a-z0-9\/-]+/g, '-');
  // Collapse multiple dashes
  s = s.replace(/-+/g, '-');
  // Collapse multiple slashes
  s = s.replace(/\/+/g, '/');
  return s;
}

export function isReservedSlug(slug: string): boolean {
  const norm = normalizeSlug(slug);
  const firstSegment = norm.split('/')[0];
  return RESERVED_SLUGS.has(firstSegment);
}

export function getDefaultContentForType(type: PageSectionType): AnySectionContent {
  switch (type) {
    case 'HERO':
      return {
        eyebrow: 'OBJECTS MADE DIFFERENTLY',
        heading: 'Sculpted by Light.',
        subheading: 'Crafted on-demand using organic biopolymers.',
        body: 'Every DAXUL piece is designed and precision-crafted in our studio.',
        desktopImage: '/images/hero-default.webp',
        mobileImage: '',
        textAlignment: 'center',
        overlay: true,
        cta1Label: 'EXPLORE OBJECTS',
        cta1Link: '/shop',
        cta2Label: 'CUSTOMIZE',
        cta2Link: '/customize',
      };
    case 'BANNER':
      return {
        text: 'FREE SHIPPING ON ALL ORDERS ABOVE ₹1,999',
        subtext: 'Crafted in 3-5 business days.',
        linkUrl: '/shop',
        buttonText: 'SHOP NOW',
        accentStyle: 'graphite',
      };
    case 'TEXT':
      return {
        eyebrow: 'OUR PHILOSOPHY',
        heading: 'Architecture Meets Additive Manufacturing',
        body: 'We create tangible objects that transform ambient light into sculptural space. Each product is printed on-demand to eliminate waste and celebrate structural minimalism.',
        align: 'center',
        maxWidth: 'md',
      };
    case 'IMAGE_TEXT':
      return {
        eyebrow: 'THE CRAFT',
        heading: 'Formed Layer by Layer',
        description: 'Our additive manufacturing process yields a distinctive micro-tactile surface, giving each object a unique warmth unmatched by industrial injection molding.',
        image: '/images/craft.webp',
        imagePosition: 'right',
        ctaLabel: 'EXPLORE MATERIALS',
        ctaLink: '/about',
      };
    case 'PRODUCT_GRID':
      return {
        heading: 'FEATURED OBJECTS',
        description: 'Limited studio editions and iconic light fixtures.',
        sortMode: 'featured',
        limit: 4,
        ctaLabel: 'VIEW ALL OBJECTS',
        ctaLink: '/shop',
      };
    case 'COLLECTION_GRID':
      return {
        heading: 'SERIES & COLLECTIONS',
        description: 'Cohesive spatial families crafted for distinct ambiances.',
        layout: '3-col',
        ctaLabel: 'ALL COLLECTIONS',
        ctaLink: '/collections',
      };
    case 'FEATURED_PRODUCT':
      return {
        badge: 'STUDIO HIGHLIGHT',
        overrideHeadline: 'Luminary Column Lamp',
        overrideDescription: 'A vertical fluted cylinder casting a soft 360° gradient. Crafted from corn-derived PLA biopolymer.',
        ctaLabel: 'VIEW OBJECT',
        ctaLink: '/shop',
      };
    case 'GALLERY':
      return {
        heading: 'STUDIO ARCHIVE',
        description: 'Objects in living spaces and architectural contexts.',
        layout: '3-col',
        items: [
          { id: '1', url: '/images/gallery-1.webp', altText: 'Column lamp on oak table' },
          { id: '2', url: '/images/gallery-2.webp', altText: 'Projection lamp reflection' },
          { id: '3', url: '/images/gallery-3.webp', altText: 'Minimal studio shelf' },
        ],
      };
    case 'VIDEO':
      return {
        heading: 'THE PRODUCTION PROCESS',
        caption: 'Watch the continuous filament deposition at our workshop.',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-laser-cutting-wood-in-a-workshop-43285-large.mp4',
        autoplay: false,
        muted: true,
        loop: true,
      };
    case 'CTA':
      return {
        heading: 'HAVE A BESPOKE VISION?',
        text: 'Collaborate with our studio to manufacture tailored lighting installations, customized lithophanes, or architectural commissions.',
        backgroundMode: 'graphite',
        buttonLabel: 'START CUSTOM PROJECT',
        buttonUrl: '/customize',
      };
    case 'STATS':
      return {
        eyebrow: 'STUDIO BENCHMARKS',
        heading: 'Engineered with Precision',
        items: [
          { id: '1', value: '100+', label: 'Custom Objects' },
          { id: '2', value: '100%', label: 'Biopolymer PLA' },
          { id: '3', value: '0.12mm', label: 'Layer Resolution' },
          { id: '4', value: 'Made in India', label: 'Studio Workshop' },
        ],
      };
    case 'TABS':
      return {
        heading: 'EXPLORE DETAILS',
        tabs: [
          {
            id: 'tab-1',
            label: 'Materials',
            content: 'We use industrial-grade, renewably sourced PLA (Polylactic Acid) derived from non-GMO cornstarch. Non-toxic, odorless, and completely food-safe.',
          },
          {
            id: 'tab-2',
            label: 'Electronics',
            content: 'Equipped with custom high-CRI (95+) warm white 2700K LED modules for maximum eye comfort, rated for 50,000+ hours.',
          },
          {
            id: 'tab-3',
            label: 'Care & Maintenance',
            content: 'Dust gently with a microfiber cloth or soft brush. Avoid prolonged exposure to temperatures above 55°C (130°F).',
          },
        ],
      };
    case 'FAQ':
      return {
        eyebrow: 'QUESTIONS & ANSWERS',
        heading: 'Frequently Asked Questions',
        items: [
          {
            id: 'faq-1',
            question: 'How long does custom production take?',
            answer: 'Every piece is crafted on-demand. Custom pieces typically take 2-4 business days for design proofing and 3-5 days for precision printing.',
          },
          {
            id: 'faq-2',
            question: 'Do you offer international shipping?',
            answer: 'Currently we ship across India with secure tracked transit. For bespoke global orders, contact our studio team.',
          },
          {
            id: 'faq-3',
            question: 'What happens if an object arrives damaged?',
            answer: 'We provide transit-safe packaging. In the rare event of transit damage, notify us within 48 hours for immediate reprint replacement.',
          },
        ],
      };
    case 'TESTIMONIALS':
      return {
        eyebrow: 'COLLECTORS & CLIENTS',
        heading: 'In Living Spaces',
        items: [
          {
            id: 't-1',
            name: 'Aarav Mehta',
            location: 'Bengaluru',
            quote: 'The light projection quality is unlike any commercial fixture I have owned. It creates a serene ambient glow in my workspace.',
            rating: 5,
          },
          {
            id: 't-2',
            name: 'Pooja Sharma',
            location: 'Mumbai',
            quote: 'Ordered a customized portrait lamp for an anniversary. The tactile layers and contrast are remarkable.',
            rating: 5,
          },
        ],
      };
    case 'CUSTOMIZATION':
      return {
        headline: 'Create Your Custom Object',
        supportingCopy: 'Turn your photographs, graphics, or names into three-dimensional light-sculpted objects.',
        ctaLabel: 'BEGIN CUSTOMIZATION',
        ctaUrl: '/customize',
        steps: [
          { id: '1', num: '01', title: 'Upload Artwork', desc: 'Provide high-res photos, typography, or line art.' },
          { id: '2', num: '02', title: 'Digital Proof', desc: 'Our team generates a photorealistic 3D light-simulation proof.' },
          { id: '3', num: '03', title: 'Additive Print', desc: 'Crafted layer-by-layer with organic biopolymer.' },
          { id: '4', num: '04', title: 'Dispatched', desc: 'Tested, safely boxed, and delivered to your doorstep.' },
        ],
      };
    case 'BRAND_STATEMENT':
      return {
        accentTag: 'THE DAXUL MANIFESTO',
        headline: 'Mass production creates uniformity. We craft intentional objects that celebrate individuality.',
        paragraph: 'By embracing additive manufacturing as our medium, we eliminate the need for mass tooling and excess warehouse stock. Every object is created for a specific human and home.',
        quoteAuthor: 'DAXUL LABS',
        quoteRole: 'Studio Collective',
      };
    case 'INSTAGRAM':
      return {
        heading: 'FROM THE STUDIO',
        handle: '@daxullabs',
        handleUrl: 'https://instagram.com/daxullabs',
        images: [
          { id: '1', url: '/images/ig-1.webp', caption: 'Night ambiance' },
          { id: '2', url: '/images/ig-2.webp', caption: 'Fresh from the printer bed' },
          { id: '3', url: '/images/ig-3.webp', caption: 'Custom lithophane test' },
          { id: '4', url: '/images/ig-4.webp', caption: 'Finishing touches' },
        ],
      };
    case 'NEWSLETTER':
      return {
        heading: 'JOIN THE ARCHIVE',
        description: 'Receive notifications on limited studio editions, experimental drop dates, and architectural insights.',
        placeholder: 'Enter your email address',
        buttonText: 'SUBSCRIBE',
      };
    case 'CONTACT':
      return {
        heading: 'GET IN TOUCH',
        description: 'Have a question about an object, custom project, or studio visit? We would love to hear from you.',
        email: 'studio@daxullabs.com',
        phone: '+91 98765 43210',
        whatsApp: '+91 98765 43210',
        address: 'DAXUL LABS Studio, India',
        showForm: true,
      };
    case 'SPACER':
      return {
        heightDesktop: 64,
        heightMobile: 40,
        showDivider: false,
      };
    default:
      return {} as AnySectionContent;
  }
}

// ----------------------------------------------------
// Page Queries & Mutations
// ----------------------------------------------------

export async function listCmsPages(options?: { includeArchived?: boolean }) {
  const where = options?.includeArchived ? {} : { status: { not: 'ARCHIVED' as const } };
  return prisma.cmsPage.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: {
      _count: {
        select: { sections: true },
      },
    },
  });
}

export async function getCmsPageById(id: string) {
  return prisma.cmsPage.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
      },
      redirects: true,
      versionHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function getCmsPageBySlug(slug: string, options?: { preview?: boolean }) {
  const normalized = normalizeSlug(slug);

  // If not previewing, only find PUBLISHED pages
  const page = await prisma.cmsPage.findFirst({
    where: {
      slug: normalized,
      ...(options?.preview ? {} : { status: 'PUBLISHED' }),
    },
    include: {
      sections: {
        where: options?.preview ? {} : { visible: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return page;
}

export async function createCmsPage(data: {
  title: string;
  slug: string;
  parentPageId?: string | null;
  status?: 'DRAFT' | 'PUBLISHED';
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
}) {
  const normSlug = normalizeSlug(data.slug);
  if (!normSlug) {
    throw new Error('Page slug cannot be empty');
  }

  if (isReservedSlug(normSlug)) {
    throw new Error(`The slug "/${normSlug}" is a reserved system route`);
  }

  const existing = await prisma.cmsPage.findUnique({
    where: { slug: normSlug },
  });
  if (existing) {
    throw new Error(`A page with slug "/${normSlug}" already exists`);
  }

  return prisma.cmsPage.create({
    data: {
      title: data.title.trim(),
      slug: normSlug,
      parentPageId: data.parentPageId || null,
      status: data.status || 'DRAFT',
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      ogImage: data.ogImage || null,
      canonicalUrl: data.canonicalUrl || null,
      noIndex: !!data.noIndex,
    },
  });
}

export async function updateCmsPage(
  id: string,
  data: {
    title?: string;
    slug?: string;
    parentPageId?: string | null;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    sortOrder?: number;
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImage?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean;
  },
  adminEmail?: string
) {
  const current = await prisma.cmsPage.findUnique({
    where: { id },
  });
  if (!current) {
    throw new Error('Page not found');
  }

  let newSlug = current.slug;
  if (data.slug !== undefined) {
    newSlug = normalizeSlug(data.slug);
    if (!newSlug) throw new Error('Page slug cannot be empty');

    if (!current.isSystem && isReservedSlug(newSlug)) {
      throw new Error(`The slug "/${newSlug}" is a reserved system route`);
    }

    if (newSlug !== current.slug) {
      const conflict = await prisma.cmsPage.findUnique({
        where: { slug: newSlug },
      });
      if (conflict && conflict.id !== id) {
        throw new Error(`A page with slug "/${newSlug}" already exists`);
      }

      // Automatically register a 301 redirect from old slug to new slug
      const fromPath = `/${current.slug}`;
      const toPath = `/${newSlug}`;
      await prisma.cmsRedirect.upsert({
        where: { fromPath },
        update: { toPath, statusCode: 301, pageId: id },
        create: { fromPath, toPath, statusCode: 301, pageId: id },
      });
    }
  }

  const updated = await prisma.cmsPage.update({
    where: { id },
    data: {
      title: data.title !== undefined ? data.title.trim() : undefined,
      slug: newSlug,
      parentPageId: data.parentPageId !== undefined ? data.parentPageId : undefined,
      status: data.status !== undefined ? data.status : undefined,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      seoTitle: data.seoTitle !== undefined ? data.seoTitle : undefined,
      seoDescription: data.seoDescription !== undefined ? data.seoDescription : undefined,
      ogImage: data.ogImage !== undefined ? data.ogImage : undefined,
      canonicalUrl: data.canonicalUrl !== undefined ? data.canonicalUrl : undefined,
      noIndex: data.noIndex !== undefined ? data.noIndex : undefined,
    },
  });

  return updated;
}

export async function duplicateCmsPage(id: string) {
  const original = await prisma.cmsPage.findUnique({
    where: { id },
    include: { sections: true },
  });
  if (!original) throw new Error('Page not found');

  let baseSlug = `${original.slug}-copy`;
  let candidateSlug = baseSlug;
  let counter = 1;
  while (await prisma.cmsPage.findUnique({ where: { slug: candidateSlug } })) {
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  const newPage = await prisma.cmsPage.create({
    data: {
      title: `Copy of ${original.title}`,
      slug: candidateSlug,
      isSystem: false,
      status: 'DRAFT',
      sortOrder: original.sortOrder + 1,
      seoTitle: original.seoTitle,
      seoDescription: original.seoDescription,
      ogImage: original.ogImage,
      canonicalUrl: null,
      noIndex: original.noIndex,
      sections: {
        create: original.sections.map((s: any) => ({
          type: s.type,
          name: s.name,
          sortOrder: s.sortOrder,
          visible: s.visible,
          draftContent: s.draftContent as any,
          publishedContent: s.publishedContent as any,
          settings: s.settings as any,
        })),
      },
    },
    include: { sections: true },
  });

  return newPage;
}

export async function archiveCmsPage(id: string) {
  const page = await prisma.cmsPage.findUnique({ where: { id } });
  if (!page) throw new Error('Page not found');
  if (page.isSystem) throw new Error('System pages cannot be archived');

  return prisma.cmsPage.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });
}

export async function deleteCmsPage(id: string) {
  const page = await prisma.cmsPage.findUnique({ where: { id } });
  if (!page) throw new Error('Page not found');
  if (page.isSystem) throw new Error('System pages cannot be deleted');

  return prisma.cmsPage.delete({ where: { id } });
}

export async function publishCmsPage(id: string, adminEmail: string) {
  const page = await prisma.cmsPage.findUnique({
    where: { id },
    include: { sections: true },
  });
  if (!page) throw new Error('Page not found');

  // 1. Copy all draftContent -> publishedContent for every section
  await prisma.$transaction(
    page.sections.map((sec: any) =>
      prisma.pageSection.update({
        where: { id: sec.id },
        data: {
          publishedContent: sec.draftContent as any,
        },
      })
    )
  );

  // 2. Set page status to PUBLISHED
  const updatedPage = await prisma.cmsPage.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: { sections: { orderBy: { sortOrder: 'asc' } } },
  });

  // 3. Store snapshot in CmsVersionHistory
  await prisma.cmsVersionHistory.create({
    data: {
      pageId: id,
      adminEmail: adminEmail || 'admin@daxullabs.com',
      action: 'PUBLISH',
      snapshot: {
        page: {
          title: page.title,
          slug: page.slug,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
        },
        sections: page.sections.map((s: any) => ({
          id: s.id,
          type: s.type,
          sortOrder: s.sortOrder,
          content: s.draftContent,
        })),
        publishedAt: new Date().toISOString(),
      },
    },
  });

  return updatedPage;
}

// ----------------------------------------------------
// Section Queries & Mutations
// ----------------------------------------------------

export async function addPageSection(
  pageId: string,
  type: PageSectionType,
  name?: string
) {
  const lastSection = await prisma.pageSection.findFirst({
    where: { pageId },
    orderBy: { sortOrder: 'desc' },
  });

  const nextSortOrder = (lastSection?.sortOrder ?? -1) + 1;
  const initialContent = getDefaultContentForType(type);

  return prisma.pageSection.create({
    data: {
      pageId,
      type,
      name: name || `${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')} Section`,
      sortOrder: nextSortOrder,
      visible: true,
      draftContent: initialContent as any,
      publishedContent: initialContent as any,
    },
  });
}

export async function updatePageSection(
  id: string,
  data: {
    name?: string;
    visible?: boolean;
    sortOrder?: number;
    draftContent?: any;
    settings?: any;
  }
) {
  return prisma.pageSection.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      visible: data.visible !== undefined ? data.visible : undefined,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      draftContent: data.draftContent !== undefined ? data.draftContent : undefined,
      settings: data.settings !== undefined ? data.settings : undefined,
    },
  });
}

export async function duplicatePageSection(id: string) {
  const sec = await prisma.pageSection.findUnique({ where: { id } });
  if (!sec) throw new Error('Section not found');

  return prisma.pageSection.create({
    data: {
      pageId: sec.pageId,
      type: sec.type,
      name: `${sec.name || sec.type} (Copy)`,
      sortOrder: sec.sortOrder + 1,
      visible: sec.visible,
      draftContent: sec.draftContent as any,
      publishedContent: sec.publishedContent as any,
      settings: sec.settings as any,
    },
  });
}

export async function deletePageSection(id: string) {
  return prisma.pageSection.delete({ where: { id } });
}

export async function reorderPageSections(pageId: string, sectionIds: string[]) {
  return prisma.$transaction(
    sectionIds.map((id, index) =>
      prisma.pageSection.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
}

export async function revertPageSection(id: string) {
  const sec = await prisma.pageSection.findUnique({ where: { id } });
  if (!sec) throw new Error('Section not found');

  return prisma.pageSection.update({
    where: { id },
    data: {
      draftContent: sec.publishedContent as any,
    },
  });
}

// ----------------------------------------------------
// Navigation Menus & Items
// ----------------------------------------------------

export async function getNavigationMenu(handle: string) {
  let menu = await prisma.navigationMenu.findUnique({
    where: { handle },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { children: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  return menu;
}

export async function upsertNavigationMenu(handle: string, name: string) {
  return prisma.navigationMenu.upsert({
    where: { handle },
    update: { name },
    create: { handle, name },
  });
}

export async function addNavigationItem(data: {
  menuId: string;
  parentId?: string | null;
  label: string;
  url: string;
  pageId?: string | null;
  openNewTab?: boolean;
}) {
  const lastItem = await prisma.navigationItem.findFirst({
    where: { menuId: data.menuId, parentId: data.parentId || null },
    orderBy: { sortOrder: 'desc' },
  });
  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  return prisma.navigationItem.create({
    data: {
      menuId: data.menuId,
      parentId: data.parentId || null,
      label: data.label.trim(),
      url: data.url.trim(),
      pageId: data.pageId || null,
      openNewTab: !!data.openNewTab,
      sortOrder,
      isActive: true,
    },
  });
}

export async function updateNavigationItem(
  id: string,
  data: {
    label?: string;
    url?: string;
    pageId?: string | null;
    openNewTab?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  return prisma.navigationItem.update({
    where: { id },
    data: {
      label: data.label !== undefined ? data.label.trim() : undefined,
      url: data.url !== undefined ? data.url.trim() : undefined,
      pageId: data.pageId !== undefined ? data.pageId : undefined,
      openNewTab: data.openNewTab !== undefined ? data.openNewTab : undefined,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
    },
  });
}

export async function deleteNavigationItem(id: string) {
  return prisma.navigationItem.delete({ where: { id } });
}

// ----------------------------------------------------
// Banners & Announcement Bar
// ----------------------------------------------------

export async function listBanners(options?: { placement?: string; activeOnly?: boolean }) {
  const now = new Date();
  const where: any = {};
  if (options?.placement) where.placement = options.placement;
  if (options?.activeOnly) {
    where.visible = true;
    where.OR = [
      { startDate: null, endDate: null },
      { startDate: { lte: now }, endDate: null },
      { startDate: null, endDate: { gte: now } },
      { startDate: { lte: now }, endDate: { gte: now } },
    ];
  }

  return prisma.banner.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function getActiveAnnouncementBanner() {
  const banners = await listBanners({ placement: 'ANNOUNCEMENT', activeOnly: true });
  return banners[0] || null;
}

export async function upsertBanner(data: {
  id?: string;
  name: string;
  placement?: string;
  text: string;
  buttonText?: string | null;
  linkUrl?: string | null;
  desktopImage?: string | null;
  mobileImage?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  priority?: number;
  visible?: boolean;
}) {
  if (data.id) {
    return prisma.banner.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        placement: data.placement || 'ANNOUNCEMENT',
        text: data.text.trim(),
        buttonText: data.buttonText || null,
        linkUrl: data.linkUrl || null,
        desktopImage: data.desktopImage || null,
        mobileImage: data.mobileImage || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        priority: data.priority ?? 0,
        visible: data.visible ?? true,
      },
    });
  }

  return prisma.banner.create({
    data: {
      name: data.name.trim(),
      placement: data.placement || 'ANNOUNCEMENT',
      text: data.text.trim(),
      buttonText: data.buttonText || null,
      linkUrl: data.linkUrl || null,
      desktopImage: data.desktopImage || null,
      mobileImage: data.mobileImage || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      priority: data.priority ?? 0,
      visible: data.visible ?? true,
    },
  });
}

export async function deleteBanner(id: string) {
  return prisma.banner.delete({ where: { id } });
}

// ----------------------------------------------------
// Redirects
// ----------------------------------------------------

export async function listRedirects() {
  return prisma.cmsRedirect.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { page: { select: { title: true, slug: true } } },
  });
}

export async function findRedirect(path: string) {
  const norm = `/${normalizeSlug(path)}`;
  return prisma.cmsRedirect.findUnique({
    where: { fromPath: norm },
  });
}

export async function deleteRedirect(id: string) {
  return prisma.cmsRedirect.delete({ where: { id } });
}
