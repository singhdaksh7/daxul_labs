import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/storeContext";
import { SiteProvider } from "@/lib/siteContext";
import { CmsProvider } from "@/lib/cmsContext";
import AdminFloatingBar from "@/components/AdminFloatingBar";
import CartDrawer from "@/components/CartDrawer";
import { getProducts, getSiteSettings, getTheme } from "@/lib/catalog";
import type { RadiusPreset } from "@/lib/types";

// Storefront data comes from PostgreSQL on every request (admin edits show up immediately).
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: s.seoTitle,
    description: s.seoDescription,
    keywords: [
      "DAXUL LABS",
      "Objects made differently",
      "Projection lamps",
      "Shadow lamps",
      "Custom 3D printing",
      "Personalized couple gifts",
    ],
    robots: s.searchIndexingEnabled ? undefined : { index: false, follow: false },
    openGraph: {
      title: s.seoTitle,
      description: s.seoDescription,
      siteName: s.brandName,
      ...(s.defaultOgImage ? { images: [s.defaultOgImage] } : {}),
    },
  };
}

// Radius presets only (no arbitrary CSS values ever reach the page).
// 'md' is the storefront's built-in look, so it emits nothing and the .daxul-card / .daxul-btn
// fallbacks in globals.css apply (default theme looks exactly as before).
const BUTTON_RADIUS: Partial<Record<RadiusPreset, string>> = {
  none: "0px",
  sm: "0.25rem",
  lg: "1rem",
  full: "9999px",
};
const CARD_RADIUS: Partial<Record<RadiusPreset, string>> = {
  none: "0px",
  sm: "0.25rem",
  lg: "1rem",
  full: "1.5rem",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, theme, products] = await Promise.all([getSiteSettings(), getTheme(), getProducts()]);

  const searchIndex = products.slice(0, 300).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    image: p.images[0] ?? "",
  }));

  // Values are validated hex colours / enumerated radius presets from lib/catalog.ts.
  const themeVars = {
    "--daxul-black": theme.carbonColor,
    "--daxul-bone": theme.boneColor,
    "--daxul-graphite": theme.graphiteColor,
    "--daxul-lime": theme.accentColor,
    ...(BUTTON_RADIUS[theme.buttonRadius] ? { "--daxul-button-radius": BUTTON_RADIUS[theme.buttonRadius] } : {}),
    ...(CARD_RADIUS[theme.borderRadius] ? { "--daxul-card-radius": CARD_RADIUS[theme.borderRadius] } : {}),
  } as CSSProperties;

  return (
    <html
      lang="en"
      style={themeVars}
      className={`${geistSans.variable} ${geistMono.variable} dark scroll-smooth`}
    >
      <body className="min-h-screen flex flex-col bg-daxul-black text-white selection:bg-daxul-lime selection:text-daxul-black">
        <SiteProvider settings={settings} searchIndex={searchIndex}>
          <StoreProvider>
            <CmsProvider>
              {children}
              <CartDrawer />
              <AdminFloatingBar />
            </CmsProvider>
          </StoreProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
