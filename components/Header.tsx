"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/storeContext";
import AnnouncementBar from "./AnnouncementBar";
import { Search, User, ShoppingBag, Menu, X, ArrowUpRight, Shield, SlidersHorizontal } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  const { cart, setIsCartOpen, siteSettings, products } = useStore();

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const filteredSearchProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-[#0B0B0C]/90 backdrop-blur-md border-b border-[#242426]/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="group flex flex-col justify-center select-none">
                <div className="flex items-center space-x-1">
                  <span className="font-extrabold text-2xl tracking-[0.2em] text-white group-hover:text-[#C8FF35] transition-colors">
                    {siteSettings.brandName.split(" ")[0]}
                    <span className="text-[#C8FF35]">{siteSettings.brandName.split(" ")[1] || "LABS"}</span>
                  </span>
                </div>
                <span className="text-[10px] tracking-[0.45em] text-[#B9B9B4] font-medium uppercase -mt-1">
                  {siteSettings.brandTagline || "OBJECTS MADE DIFFERENTLY"}
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center space-x-8 text-xs uppercase tracking-widest font-semibold text-[#B9B9B4]">
                <Link
                  href="/shop"
                  className={`hover:text-white transition-colors py-1 ${
                    pathname === "/shop" ? "text-[#C8FF35] font-bold" : ""
                  }`}
                >
                  Shop
                </Link>
                <Link
                  href="/collections"
                  className={`hover:text-white transition-colors py-1 ${
                    pathname === "/collections" ? "text-[#C8FF35] font-bold" : ""
                  }`}
                >
                  Collections
                </Link>
                <Link
                  href="/customize"
                  className={`hover:text-white transition-colors py-1 ${
                    pathname === "/customize" ? "text-[#C8FF35] font-bold" : ""
                  }`}
                >
                  Customize
                </Link>
                <Link
                  href="/lab"
                  className={`hover:text-[#C8FF35] transition-colors py-1 flex items-center gap-1 ${
                    pathname === "/lab" ? "text-[#C8FF35] font-bold" : ""
                  }`}
                >
                  Lab <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35] inline-block animate-pulse"></span>
                </Link>
                <Link
                  href="/about"
                  className={`hover:text-white transition-colors py-1 ${
                    pathname === "/about" ? "text-[#C8FF35] font-bold" : ""
                  }`}
                >
                  About
                </Link>
              </nav>
            </div>

            {/* Right Side Utilities & CTA */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search Catalog"
                className="text-[#B9B9B4] hover:text-[#C8FF35] p-2 rounded-full transition-colors focus:outline-none"
              >
                <Search className="w-4 h-4" />
              </button>

              <Link
                href="/account"
                aria-label="Account & Orders"
                className="text-[#B9B9B4] hover:text-[#C8FF35] p-2 rounded-full transition-colors focus:outline-none hidden sm:block"
              >
                <User className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="View Cart"
                className="text-[#B9B9B4] hover:text-[#C8FF35] p-2 rounded-full transition-colors focus:outline-none relative"
              >
                <ShoppingBag className="w-4 h-4" />
                {totalCartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#C8FF35] text-[#0B0B0C] text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {totalCartCount}
                  </span>
                )}
              </button>

              <Link
                href="/shop"
                className="hidden lg:inline-flex items-center gap-2 bg-transparent border border-[#242426] hover:border-[#C8FF35] text-white hover:text-[#C8FF35] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300"
              >
                Explore Objects
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-[#B9B9B4] hover:text-white p-2 focus:outline-none"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0B0B0C] border-b border-[#242426] px-6 py-6 space-y-4 animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col space-y-4 text-sm font-semibold uppercase tracking-widest text-[#B9B9B4]">
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-2 border-b border-[#151515]"
              >
                Shop
              </Link>
              <Link
                href="/collections"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-2 border-b border-[#151515]"
              >
                Collections
              </Link>
              <Link
                href="/customize"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-2 border-b border-[#151515]"
              >
                Customize
              </Link>
              <Link
                href="/lab"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#C8FF35] transition-colors py-2 border-b border-[#151515] flex items-center justify-between"
              >
                <span>Lab</span>
                <span className="px-2 py-0.5 bg-[#C8FF35]/10 text-[#C8FF35] text-[10px] rounded">EXPERIMENTAL</span>
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-2 border-b border-[#151515]"
              >
                About
              </Link>
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-2 border-b border-[#151515]"
              >
                My Account & Track Orders
              </Link>
            </nav>
            <div className="pt-2">
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#C8FF35] text-[#0B0B0C] font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-[#C8FF35]/20"
              >
                Explore Objects
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Quick Search Overlay Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="max-w-3xl w-full mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-[#242426] pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8FF35]">Search DAXUL Catalog</span>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#242426]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search shadow lamps, couple monoliths, keychains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#151515] border border-[#242426] focus:border-[#C8FF35] rounded-2xl pl-12 pr-4 py-4 text-white text-base placeholder:text-gray-600 focus:outline-none"
              />
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
              {searchQuery && filteredSearchProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No objects found matching "{searchQuery}"
                </div>
              ) : (
                filteredSearchProducts.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/shop/${prod.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-4 p-3 bg-[#151515] border border-[#242426] hover:border-[#C8FF35] rounded-xl transition-all group"
                  >
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-14 h-14 object-cover rounded-lg bg-[#0B0B0C]"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#C8FF35] font-semibold uppercase">{prod.category}</div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#C8FF35] transition-colors">
                        {prod.name}
                      </h4>
                    </div>
                    <div className="text-sm font-extrabold text-white">
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
