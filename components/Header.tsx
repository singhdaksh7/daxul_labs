"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/storeContext";
import { useSite } from "@/lib/siteContext";
import { useCms } from "@/lib/cmsContext";
import AnnouncementBar from "./AnnouncementBar";
import SearchOverlay from "./SearchOverlay";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  const { cart, setIsCartOpen } = useCart();
  const { settings: siteSettings, searchIndex: products } = useSite();
  const { header } = useCms();

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);


  const defaultNavItems: { id?: string; label: string; url: string; isLab?: boolean; openNewTab?: boolean; children?: any[] }[] = [
    { label: "Shop", url: "/shop" },
    { label: "Collections", url: "/collections" },
    { label: "Customize", url: "/customize" },
    { label: "About", url: "/about" },
    { label: "Lab", url: "/lab", isLab: true },
  ];

  const [dynamicNavItems, setDynamicNavItems] = useState<typeof defaultNavItems | null>(null);

  React.useEffect(() => {
    fetch("/api/navigation?handle=header")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.menu?.items && data.menu.items.length > 0) {
          const rootItems = data.menu.items
            .filter((i: any) => !i.parentId && i.isActive)
            .map((i: any) => ({
              id: i.id,
              label: i.label,
              url: i.url,
              openNewTab: i.openNewTab,
              isLab: i.url === "/lab",
              children: i.children?.filter((c: any) => c.isActive) || [],
            }));
          if (rootItems.length > 0) {
            setDynamicNavItems(rootItems);
          }
        }
      })
      .catch(() => {});
  }, []);

  const navItems: any[] = dynamicNavItems || (header?.navItems && header.navItems.length > 0 ? header.navItems : defaultNavItems);

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

            {/* Center: Desktop Navigation Links with Dropdown Support */}
            <nav className="hidden md:flex items-center space-x-8 text-xs uppercase tracking-[0.18em] font-medium text-daxul-black/70">
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                const hasChildren = item.children && item.children.length > 0;
                return (
                  <div key={item.url + item.label} className="relative group py-1">
                    <Link
                      href={item.url}
                      target={item.openNewTab ? "_blank" : undefined}
                      rel={item.openNewTab ? "noopener noreferrer" : undefined}
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

                    {/* Dropdown Menu */}
                    {hasChildren && (
                      <div className="absolute top-full left-0 hidden group-hover:block pt-2 z-50 animate-in fade-in-50 duration-150">
                        <div className="bg-daxul-bone border border-daxul-black/10 shadow-lg py-2 min-w-[180px]">
                          {item.children!.map((child: any) => (
                            <Link
                              key={child.id || child.url + child.label}
                              href={child.url}
                              target={child.openNewTab ? "_blank" : undefined}
                              rel={child.openNewTab ? "noopener noreferrer" : undefined}
                              className="block px-4 py-2 text-[11px] uppercase tracking-wider text-daxul-black/75 hover:text-daxul-black hover:bg-black/5 transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* Search V2 Global Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
