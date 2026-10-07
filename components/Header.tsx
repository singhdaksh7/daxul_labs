"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/storeContext";
import { useSite } from "@/lib/siteContext";
import { useCms } from "@/lib/cmsContext";
import AnnouncementBar from "./AnnouncementBar";
import { Search, User, ShoppingBag, Menu, X, ArrowUpRight } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  const { cart, setIsCartOpen } = useCart();
  const { settings: siteSettings, searchIndex: products } = useSite();
  const { header } = useCms();

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const filteredSearchProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const navItems = header?.navItems || [
    { label: "Shop", url: "/shop" },
    { label: "Collections", url: "/collections" },
    { label: "Customize", url: "/customize" },
    { label: "Lab", url: "/lab", isLab: true },
    { label: "About", url: "/about" },
  ];

  const logoText = header?.logoText || siteSettings.brandName || "DAXUL LABS";
  const logoSubtext = header?.logoSubtext || siteSettings.brandTagline || "MADE DIFFERENTLY";

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-daxul-black/85 backdrop-blur-md border-b border-daxul-graphite transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Left: Brand Wordmark */}
            <div className="flex items-center gap-10">
              <Link href="/" className="group flex flex-col justify-center select-none">
                {header?.logoImage ? (
                  <img src={header.logoImage} alt={logoText} className="h-6 sm:h-8 object-contain" />
                ) : (
                  <>
                    <span className="font-mono font-bold text-base sm:text-lg tracking-[0.22em] text-white group-hover:text-white/80 transition-colors uppercase">
                      {logoText}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.35em] text-daxul-gray uppercase -mt-0.5">
                      {logoSubtext}
                    </span>
                  </>
                )}
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center space-x-7 text-[11px] uppercase tracking-[0.2em] font-medium text-daxul-gray">
                {navItems.map((item) => {
                  const isActive = pathname === item.url;
                  return (
                    <Link
                      key={item.url + item.label}
                      href={item.url}
                      className={`relative py-1 transition-colors duration-200 hover:text-white flex items-center gap-1.5 ${
                        isActive ? "text-white font-semibold" : ""
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.isLab && header?.showStatusDot !== false && (
                        <span className="w-1.5 h-1.5 rounded-full bg-daxul-lime inline-block" />
                      )}
                      {isActive && !item.isLab && (
                        <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Search, Account, Cart */}
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search Catalog"
                className="text-daxul-gray hover:text-white p-2 transition-colors focus:outline-none"
              >
                <Search className="w-4 h-4 stroke-[1.5]" />
              </button>

              <Link
                href="/account"
                aria-label="Account & Orders"
                className="text-daxul-gray hover:text-white p-2 transition-colors focus:outline-none hidden sm:block"
              >
                <User className="w-4 h-4 stroke-[1.5]" />
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="View Cart"
                className="text-daxul-gray hover:text-white p-2 transition-colors focus:outline-none relative"
              >
                <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                {totalCartCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-daxul-lime text-daxul-black text-[9px] font-mono font-bold rounded-full flex items-center justify-center">
                    {totalCartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-daxul-gray hover:text-white p-2 focus:outline-none"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-daxul-black border-b border-daxul-graphite px-6 py-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-5 text-sm font-medium uppercase tracking-[0.2em] text-daxul-gray">
              {navItems.map((item) => (
                <Link
                  key={item.url + item.label}
                  href={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`hover:text-white transition-colors pb-3 border-b border-daxul-graphite/60 flex items-center justify-between ${
                    pathname === item.url ? "text-white font-bold" : ""
                  }`}
                >
                  <span>{item.label}</span>
                  {item.isLab && (
                    <span className="text-[10px] font-mono text-daxul-lime border border-daxul-lime/30 px-2 py-0.5">
                      LAB 0.1
                    </span>
                  )}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors pb-3 border-b border-daxul-graphite/60"
              >
                Account & Orders
              </Link>
            </nav>

            <div className="pt-2">
              <Link
                href={header?.ctaUrl || "/shop"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-white text-daxul-black font-mono text-xs uppercase tracking-[0.2em] py-3.5 transition-colors hover:bg-daxul-bone"
              >
                <span>{header?.ctaLabel || "Explore Catalog"}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Quick Search Overlay Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-daxul-black/95 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-150">
          <div className="max-w-3xl w-full mx-auto space-y-6 pt-4 sm:pt-8">
            <div className="flex justify-between items-center border-b border-daxul-graphite pb-4">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-daxul-gray">
                [ SEARCH CATALOG ]
              </span>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-2 text-daxul-gray hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-4 text-daxul-gray" />
              <input
                type="text"
                autoFocus
                placeholder="Search shadow lamps, custom monoliths, desk objects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-daxul-dark border border-daxul-graphite focus:border-white pl-12 pr-4 py-4 text-white text-sm tracking-wide placeholder:text-daxul-gray/50 focus:outline-none font-sans"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
              {searchQuery && filteredSearchProducts.length === 0 ? (
                <div className="text-center py-12 text-daxul-gray text-xs font-mono uppercase tracking-widest">
                  No objects found matching "{searchQuery}"
                </div>
              ) : (
                filteredSearchProducts.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/shop/${prod.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-4 p-3 bg-daxul-dark border border-daxul-graphite hover:border-white transition-all group"
                  >
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-14 h-14 object-cover bg-daxul-black"
                    />
                    <div className="flex-1">
                      <div className="font-mono text-[10px] text-daxul-gray uppercase tracking-widest">
                        {prod.category}
                      </div>
                      <h4 className="text-sm font-medium text-white group-hover:text-daxul-lime transition-colors">
                        {prod.name}
                      </h4>
                    </div>
                    <div className="font-mono text-xs text-white">
                      {siteSettings.currencySymbol}{prod.price}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
