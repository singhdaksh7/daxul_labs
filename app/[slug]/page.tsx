import React from 'react';
import { notFound, redirect, RedirectType } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/db';
import { getCmsPageBySlug, findRedirect } from '@/lib/cms/pageService';
import { getCatalog } from '@/lib/catalog';
import CmsSectionRenderer from '@/components/cms/CmsSectionRenderer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPageBySlug(slug);
  if (!page) return {};

  return {
    title: page.seoTitle || `${page.title} | DAXUL LABS`,
    description: page.seoDescription || undefined,
    openGraph: page.ogImage
      ? {
          title: page.seoTitle || page.title,
          description: page.seoDescription || undefined,
          images: [{ url: page.ogImage }],
        }
      : undefined,
    alternates: page.canonicalUrl ? { canonical: page.canonicalUrl } : undefined,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
  };
}

export default async function DynamicCmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === 'true';

  // 1. Check if there is an active 301 redirect for this slug
  const activeRedirect = await findRedirect(slug);
  if (activeRedirect) {
    redirect(activeRedirect.toPath, RedirectType.replace);
  }

  // 2. Fetch page (draft allowed only if preview=true)
  const page = await getCmsPageBySlug(slug, { preview: isPreview });
  if (!page) {
    notFound();
  }

  // 3. Fetch live DB products and collections for data-bound sections
  const { products, collections } = await getCatalog();

  return (
    <div className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />
      <main className="flex-1">
        {isPreview && (
          <div className="bg-daxul-lime text-daxul-black px-4 py-2 font-mono text-xs uppercase tracking-widest text-center font-bold sticky top-0 z-50">
            Preview Mode — Draft Content
          </div>
        )}

        {page.sections.map((section: any) => {
          const sanitizedSection = {
            ...section,
            draftContent: isPreview ? section.draftContent : undefined,
          };
          return (
            <CmsSectionRenderer
              key={section.id}
              section={sanitizedSection as any}
              useDraft={isPreview}
              products={products}
              collections={collections}
            />
          );
        })}
      </main>
      <Footer />
    </div>
  );
}
