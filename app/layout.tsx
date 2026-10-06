import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/storeContext";
import AdminFloatingBar from "@/components/AdminFloatingBar";
import CartDrawer from "@/components/CartDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DAXUL LABS | Objects Made Differently",
  description:
    "Experimental 3D-printed consumer brand. Dark premium projection lamps, personalized couple monoliths, devotional altars, and desk objects.",
  keywords: [
    "DAXUL LABS",
    "Objects made differently",
    "Projection lamps",
    "Shadow lamps",
    "Custom 3D printing",
    "Personalized couple gifts",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-[#0B0B0C] text-white selection:bg-[#C8FF35] selection:text-[#0B0B0C]">
        <StoreProvider>
          {children}
          <CartDrawer />
          <AdminFloatingBar />
        </StoreProvider>
      </body>
    </html>
  );
}
