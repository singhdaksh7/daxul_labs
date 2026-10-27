import prisma from '@/lib/db';
import { getDefaultContentForType } from './pageService';
import { PageSectionType } from './pageTypes';

export async function ensureDefaultCmsData() {
  try {
    // 1. Seed Pages
    const pagesCount = await prisma.cmsPage.count();
    if (pagesCount === 0) {
      const defaultPages: Array<{
        title: string;
        slug: string;
        isSystem: boolean;
        seoTitle: string;
        seoDescription: string;
        sections: PageSectionType[];
      }> = [
        {
          title: 'Home',
          slug: 'home',
          isSystem: true,
          seoTitle: 'DAXUL LABS | Designed 3D Printed Objects & Projection Lamps',
          seoDescription: 'Minimalist lighting, sculptural desk objects, and custom light projections crafted on-demand using organic biopolymers.',
          sections: ['HERO', 'FEATURED_PRODUCT', 'COLLECTION_GRID', 'CUSTOMIZATION', 'BRAND_STATEMENT', 'GALLERY', 'NEWSLETTER'],
        },
        {
          title: 'About',
          slug: 'about',
          isSystem: true,
          seoTitle: 'About DAXUL LABS | Studio Philosophy & Craft',
          seoDescription: 'Learn about our additive manufacturing philosophy, organic biopolymer materials, and precision craftsmanship in India.',
          sections: ['HERO', 'TEXT', 'IMAGE_TEXT', 'STATS', 'CTA'],
        },
        {
          title: 'Customize',
          slug: 'customize',
          isSystem: true,
          seoTitle: 'Custom 3D Printed Lithophanes & Objects | DAXUL LABS',
          seoDescription: 'Transform personal photographs and bespoke designs into light-refracting 3D objects with studio-grade precision.',
          sections: ['HERO', 'CUSTOMIZATION', 'GALLERY', 'FAQ', 'CTA'],
        },
        {
          title: 'Lab',
          slug: 'lab',
          isSystem: true,
          seoTitle: 'DAXUL LAB | Experimental Objects & R&D',
          seoDescription: 'Explore our latest experimental prototypes, geometric explorations, and cutting-edge material testing.',
          sections: ['HERO', 'IMAGE_TEXT', 'GALLERY', 'CTA'],
        },
        {
          title: 'Contact',
          slug: 'contact',
          isSystem: true,
          seoTitle: 'Contact Us | DAXUL LABS Studio',
          seoDescription: 'Get in touch for bespoke commissions, architectural orders, or customer support.',
          sections: ['HERO', 'CONTACT', 'FAQ'],
        },
      ];

      for (let i = 0; i < defaultPages.length; i++) {
        const p = defaultPages[i];
        const page = await prisma.cmsPage.create({
          data: {
            title: p.title,
            slug: p.slug,
            isSystem: p.isSystem,
            status: 'PUBLISHED',
            sortOrder: i,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            sections: {
              create: p.sections.map((secType, sIdx) => {
                const content = getDefaultContentForType(secType);
                return {
                  type: secType,
                  name: `${secType.charAt(0) + secType.slice(1).toLowerCase().replace('_', ' ')}`,
                  sortOrder: sIdx,
                  visible: true,
                  draftContent: content as any,
                  publishedContent: content as any,
                };
              }),
            },
          },
        });
      }
    }

    // 2. Seed Navigation Menus
    const headerMenu = await prisma.navigationMenu.findUnique({ where: { handle: 'header' } });
    if (!headerMenu) {
      await prisma.navigationMenu.create({
        data: {
          handle: 'header',
          name: 'Main Header Navigation',
          items: {
            create: [
              { label: 'Shop', url: '/shop', sortOrder: 0, isActive: true },
              { label: 'Collections', url: '/collections', sortOrder: 1, isActive: true },
              { label: 'Customize', url: '/customize', sortOrder: 2, isActive: true },
              { label: 'About', url: '/about', sortOrder: 3, isActive: true },
              { label: 'Lab', url: '/lab', sortOrder: 4, isActive: true },
            ],
          },
        },
      });
    }

    const footerMenu = await prisma.navigationMenu.findUnique({ where: { handle: 'footer' } });
    if (!footerMenu) {
      await prisma.navigationMenu.create({
        data: {
          handle: 'footer',
          name: 'Footer Links',
          items: {
            create: [
              { label: 'Shop All Objects', url: '/shop', sortOrder: 0, isActive: true },
              { label: 'Collections', url: '/collections', sortOrder: 1, isActive: true },
              { label: 'Customize', url: '/customize', sortOrder: 2, isActive: true },
              { label: 'About DAXUL', url: '/about', sortOrder: 3, isActive: true },
              { label: 'Track Order', url: '/track', sortOrder: 4, isActive: true },
              { label: 'Shipping & Delivery', url: '/policies/shipping', sortOrder: 5, isActive: true },
              { label: 'Returns & Replacement', url: '/policies/returns', sortOrder: 6, isActive: true },
              { label: 'Terms & Conditions', url: '/policies/terms', sortOrder: 7, isActive: true },
              { label: 'Privacy Policy', url: '/policies/privacy', sortOrder: 8, isActive: true },
              { label: 'Contact Us', url: '/contact', sortOrder: 9, isActive: true },
            ],
          },
        },
      });
    }

    // 3. Seed Announcement Banner
    const announcementCount = await prisma.banner.count({
      where: { placement: 'ANNOUNCEMENT' },
    });
    if (announcementCount === 0) {
      await prisma.banner.create({
        data: {
          name: 'Default Store Announcement',
          placement: 'ANNOUNCEMENT',
          text: 'ON-DEMAND PRODUCTION • FREE SHIPPING ON ORDERS OVER ₹1999',
          linkUrl: '/shop',
          buttonText: 'SHOP',
          priority: 10,
          visible: true,
          status: 'PUBLISHED',
        },
      });
    }

    // 4. Seed Homepage Hero Carousel Slides
    const heroBannerCount = await prisma.banner.count({
      where: { placement: { in: ['HOMEPAGE_HERO', 'HOMEPAGE_TOP'] } },
    });
    if (heroBannerCount === 0) {
      await prisma.banner.createMany({
        data: [
          {
            name: 'Hero Slide 1 — Objects Made Differently',
            placement: 'HOMEPAGE_HERO',
            text: 'OBJECTS MADE DIFFERENTLY.',
            eyebrow: 'DAXUL LABS / STUDIO',
            headline: 'OBJECTS MADE DIFFERENTLY.',
            subheadline: 'Sculptural lighting, custom lithophanes, and tactile devotional altars.',
            body: 'Manufactured on-demand in India with algorithmic optics and plant-derived biopolymers.',
            buttonText: 'SHOP OBJECTS',
            linkUrl: '/shop',
            secondaryCtaLabel: 'EXPLORE STUDIO',
            secondaryCtaUrl: '/about',
            desktopImage: '/images/hero_shadow_lamp.jpg',
            mobileImage: '/images/hero_shadow_lamp.jpg',
            textAlign: 'left',
            textMode: 'dark',
            overlay: false,
            status: 'PUBLISHED',
            priority: 10,
            visible: true,
          },
          {
            name: 'Hero Slide 2 — Custom Commissions',
            placement: 'HOMEPAGE_HERO',
            text: 'TURN IMAGINATION INTO LIGHT.',
            eyebrow: 'BESPOKE ARCHITECTURE',
            headline: 'TURN IMAGINATION INTO LIGHT.',
            subheadline: 'Commission personalized lithophane lanterns and custom ambient installations.',
            body: 'Send us your artwork or ideas. We craft precision digital proofs and manufacture to order.',
            buttonText: 'START CUSTOM PROJECT',
            linkUrl: '/customize',
            secondaryCtaLabel: 'VIEW LAB EXPERIMENTS',
            secondaryCtaUrl: '/lab',
            desktopImage: '/images/custom_preview.jpg',
            mobileImage: '/images/custom_preview.jpg',
            textAlign: 'left',
            textMode: 'dark',
            overlay: false,
            status: 'PUBLISHED',
            priority: 5,
            visible: true,
          },
        ],
      });
    }
  } catch (err) {
    console.error('ensureDefaultCmsData error:', err);
  }
}
