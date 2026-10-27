"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/storeContext";
import { useSite } from "@/lib/siteContext";
import { useCms } from "@/lib/cmsContext";
import AnnouncementBar from "./AnnouncementBar";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";

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

  const defaultNavItems: { label: string; url: string; isLab?: boolean }[] = [
    { label: "Shop", url: "/shop" },
    { label: "Collections", url: "/collections" },
    { label: "Customize", url: "/customize" },
    { label: "About", url: "/about" },
  ];

  const navItems = header?.navItems && header.navItems.length > 0 ? header.navItems : defaultNavItems;

  const logoText = header?.logoText || siteSettings.brandName || "DAXUL LABS";
  const logoSubtext = header?.logoSubtext;

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-daxul-bone border-b border-daxul-black/10 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Left: Brand Wordmark */}
            <div className="flex items-center">
              <Link href="/" className="group flex flex-col justify-center select-none">
                {header?.logoImage ? (
                  <img src={header.logoImage} alt={logoText} className="h-6 sm:h-8 object-contain" />
                ) : (
                  <>
                    <span className="font-sans font-bold text-base sm:text-lg tracking-[0.22em] text-daxul-black group-hover:text-daxul-black/75 transition-colors uppercase">
                      {logoText}
                    </span>
                    {logoSubtext && (
                      <span className="font-mono text-[9px] tracking-[0.3em] text-[#71717A] uppercase -mt-0.5">
                        {logoSubtext}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </div>

            {/* Center: Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 text-xs uppercase tracking-[0.18em] font-medium text-daxul-black/70">
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <Link
                    key={item.url + item.label}
                    href={item.url}
                    className={`relative py-1 transition-colors duration-150 hover:text-daxul-black flex items-center gap-1.5 ${
                      isActive ? "text-daxul-black font-semibold" : ""
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.isLab && header?.showStatusDot !== false && (
                      <span className="w-1.5 h-1.5 rounded-full bg-daxul-lime inline-block" />
                    )}
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-daxul-black" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Search, Account, Cart */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search Catalog"
                className="text-daxul-black/75 hover:text-daxul-black p-2 transition-colors focus:outline-none"
              >
                <Search className="w-4 h-4 stroke-[1.75]" />
              </button>

              <Link
                href="/account"
                aria-label="Account & Orders"
                className="text-daxul-black/75 hover:text-daxul-black p-2 transition-colors focus:outline-none hidden sm:block"
              >
                <User className="w-4 h-4 stroke-[1.75]" />
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="View Cart"
                className="text-daxul-black/75 hover:text-daxul-black p-2 transition-colors focus:outline-none relative flex items-center"
              >
                <ShoppingBag className="w-4 h-4 stroke-[1.75]" />
                {totalCartCount > 0 && (
                  <span className="ml-1.5 min-w-[18px] h-[18px] px-1 bg-daxul-lime text-daxul-black text-[10px] font-mono font-bold rounded-full flex items-center justify-center border border-daxul-black/20">
                    {totalCartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-daxul-black p-2 focus:outline-none"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-daxul-bone border-b border-daxul-black/10 px-6 py-6 space-y-5 animate-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-daxul-black/80">
              {navItems.map((item) => (
                <Link
                  key={item.url + item.label}
                  href={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`hover:text-daxul-black transition-colors py-2 border-b border-daxul-black/5 flex items-center justify-between ${
                    pathname === item.url ? "text-daxul-black font-bold" : ""
                  }`}
                >
                  <span>{item.label}</span>
                  {item.isLab && (
                    <span className="text-[10px] font-mono text-daxul-black bg-daxul-lime px-2 py-0.5 rounded">
                      LAB
                    </span>
                  )}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-daxul-black transition-colors py-2 border-b border-daxul-black/5"
              >
                Account & Orders
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Global Quick Search Overlay Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-daxul-black/40 backdrop-blur-sm flex flex-col p-4 sm:p-8 animate-in fade-in duration-150">
          <div className="max-w-2xl w-full mx-auto bg-daxul-bone border border-daxul-black/20 p-6 sm:p-8 space-y-6 mt-8 sm:mt-16 daxul-card shadow-2xl">
            <div className="flex justify-between items-center border-b border-daxul-black/10 pb-4">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A]">
                Search Catalog
              </span>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 text-daxul-black/60 hover:text-daxul-black transition-colors"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#71717A]" />
              <input
                type="text"
                autoFocus
                placeholder="Search shadow lamps, custom objects, altars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-daxul-black/15 focus:border-daxul-black rounded-lg pl-11 pr-4 py-3 text-daxul-black text-sm tracking-wide placeholder:text-[#71717A]/60 focus:outline-none font-sans"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {searchQuery && filteredSearchProducts.length === 0 ? (
                <div className="text-center py-10 text-[#71717A] text-xs font-mono uppercase tracking-widest">
                  No objects found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredSearchProducts.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/shop/${prod.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-4 p-3 bg-white border border-daxul-black/10 hover:border-daxul-black transition-all daxul-card group"
                  >
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-12 h-12 object-cover rounded bg-[#EBE7DF]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-[#EBE7DF]" />
                    )}
                    <div className="flex-1">
                      <div className="font-mono text-[10px] text-[#71717A] uppercase tracking-wider">
                        {prod.category}
                      </div>
                      <h4 className="text-sm font-semibold text-daxul-black group-hover:underline">
                        {prod.name}
                      </h4>
                    </div>
                    <div className="font-sans text-xs font-semibold text-daxul-black">
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
