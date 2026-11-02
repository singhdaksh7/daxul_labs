"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Users,
  Ticket,
  Factory,
  Sparkles,
  Boxes,
  PenSquare,
  FileText,
  Compass,
  Megaphone,
  Inbox,
  Image as ImageIcon,
  ScrollText,
  Search,
  BarChart3,
  Settings,
  Palette,
  ClipboardList,
  LogOut,
  ChevronDown,
  Truck,
  Menu,
  X,
  ExternalLink,
  CreditCard,
  Clock,
  CheckSquare,
  Star,
  Bell,
  HelpCircle,
  ArrowDownRight,
  TrendingUp,
  Award,
  Gift,
  Coins,
  Share2,
  Users2,
  Zap,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; view?: string };
const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  {
    section: "Operations",
    items: [
      { label: "Today Overview", href: "/admin/operations/today", icon: LayoutDashboard },
      { label: "Print Queue & Fleet", href: "/admin/production/queue", icon: Factory },
      { label: "Materials & Spools", href: "/admin/materials", icon: Boxes },
      { label: "Bill of Materials", href: "/admin/bom", icon: Layers },
      { label: "Failures & Reprints", href: "/admin/production/failures", icon: CheckSquare },
      { label: "Suppliers & POs", href: "/admin/purchasing", icon: ShoppingBag },
      { label: "Shipments & Dispatch", href: "/admin/shipments", icon: Package },
      { label: "Alert Center", href: "/admin/alerts", icon: Bell },
    ],
  },
  {
    section: "Partner Finance",
    items: [
      { label: "Finance Dashboard", href: "/admin/finance", icon: LayoutDashboard },
      { label: "Expenses", href: "/admin/finance/expenses", icon: CreditCard },
      { label: "EMIs & Schedules", href: "/admin/finance/emi", icon: Clock },
      { label: "Partner Accounts", href: "/admin/finance/partners", icon: Users },
      { label: "Settlements", href: "/admin/finance/settlements", icon: CheckSquare },
      { label: "Capital & Advances", href: "/admin/finance/capital", icon: Coins },
      { label: "Profit Periods", href: "/admin/finance/periods", icon: TrendingUp },
    ],
  },
  {
    section: "Finance & Staff",
    items: [
      { label: "Margin Analytics", href: "/admin/analytics/margins", icon: TrendingUp },
      { label: "Staff & Permissions", href: "/admin/staff", icon: Users },
      { label: "Operations Settings", href: "/admin/settings/operations", icon: Settings },
      { label: "Shiprocket", href: "/admin/settings/shiprocket", icon: Truck },
    ],
  },
  {
    section: "Commerce",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      { label: "Abandoned Carts", href: "/admin/abandoned-checkouts", icon: Clock },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Collections", href: "/admin/collections", icon: Layers },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Product Q&A", href: "/admin/qa", icon: HelpCircle },
      { label: "Back in Stock", href: "/admin/back-in-stock", icon: Bell },
    ],
  },
  {
    section: "Production",
    items: [
      { label: "Job Tickets & QC", href: "/admin/production", icon: CheckSquare },
      { label: "Manufacturing", href: "/admin/orders?view=manufacturing", icon: Factory, view: "manufacturing" },
      { label: "Customizations", href: "/admin/orders?view=customizations", icon: Sparkles, view: "customizations" },
      { label: "Lithophane Builder", href: "/admin/lithophane", icon: Sparkles },
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
    ],
  },
  {
    section: "Content",
    items: [
      { label: "Pages", href: "/admin/pages", icon: FileText },
      { label: "Navigation", href: "/admin/navigation", icon: Compass },
      { label: "Banners", href: "/admin/banners", icon: Megaphone },
      { label: "Inquiries", href: "/admin/inquiries", icon: Inbox },
      { label: "Site Editor", href: "/admin/site-editor", icon: PenSquare },
      { label: "Media Library", href: "/admin/media", icon: ImageIcon },
      { label: "Policies", href: "/admin/policies", icon: ScrollText },
      { label: "SEO", href: "/admin/seo", icon: Search },
    ],
  },
  {
    section: "Retention & Lifecycle",
    items: [
      { label: "Loyalty & Rewards", href: "/admin/loyalty", icon: Award },
      { label: "Referral Desk", href: "/admin/referrals", icon: Share2 },
      { label: "Gift Cards", href: "/admin/gift-cards", icon: Gift },
      { label: "Store Credit", href: "/admin/store-credit", icon: Coins },
      { label: "Customer Segments", href: "/admin/customer-segments", icon: Users2 },
      { label: "Automations", href: "/admin/automations", icon: Zap },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Analytics Overview", href: "/admin/analytics", icon: BarChart3 },
      { label: "Retention Analytics", href: "/admin/analytics/retention", icon: TrendingUp },
      { label: "Conversion Funnel", href: "/admin/analytics/funnel", icon: ArrowDownRight },
      { label: "Product Conversion", href: "/admin/analytics/products", icon: TrendingUp },
      { label: "Store Settings", href: "/admin/settings", icon: Settings },
      { label: "Retention Settings", href: "/admin/settings/retention", icon: Settings },
      { label: "Theme", href: "/admin/theme", icon: Palette },
      { label: "Audit Logs", href: "/admin/audit", icon: ClipboardList },
    ],
  },
];

export default function AdminShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/admin";
  const view = useSearchParams()?.get("view") ?? null;
  const [open, setOpen] = useState(false);
  // Accordion: only the section holding the current page is open by default; the rest stay collapsed.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpen(false);
  }, [pathname, view]);

  const isActive = (item: NavItem) => {
    const base = item.href.split("?")[0];
    if (item.view) return pathname === base && view === item.view;
    if (base === "/admin") return pathname === "/admin";
    if (base === "/admin/orders") return pathname.startsWith(base) && !(pathname === base && (view === "manufacturing" || view === "customizations"));
    return pathname === base || pathname.startsWith(base + "/");
  };

  const sectionHasActive = (group: (typeof NAV)[number]) => group.items.some((i) => isActive(i));

  useEffect(() => {
    const current = NAV.find((g) => g.items.some((i) => isActive(i)));
    if (current) setExpanded((prev) => ({ ...prev, [current.section]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, view]);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0B0B0C]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#242426] px-5">
        <Link href="/admin" className="flex flex-col leading-none">
          <span className="text-sm font-black uppercase tracking-[0.25em] text-[#F3F0E9]">DAXUL</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C8FF35]">Studio OS</span>
        </Link>
        <button className="rounded-md p-1.5 text-gray-400 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="admin-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        {NAV.map((group) => {
          const isOpen = !!expanded[group.section];
          const hasActive = sectionHasActive(group);
          const panelId = `nav-${group.section.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return (
            <div key={group.section}>
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [group.section]: !isOpen }))}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-[#151515] ${
                  hasActive ? "text-[#C8FF35]" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {group.section}
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <ul id={panelId} className="mb-2 mt-0.5 space-y-0.5 border-l border-[#242426] pl-2 ml-3">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-[#C8FF35] text-[#0B0B0C]"
                              : "text-gray-300 hover:bg-[#242426] hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-3 border-t border-[#242426] p-4">
        <Link href="/" target="_blank" className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#C8FF35]">
          <ExternalLink className="h-3.5 w-3.5" /> View live store
        </Link>
        <div className="rounded-lg bg-[#151515] p-3">
          <p className="truncate text-xs font-semibold text-[#F3F0E9]" title={email}>{email}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#C8FF35]">{role.replace("_", " ")}</p>
          <button
            onClick={async () => {
              try {
                await signOut({ redirect: false });
              } finally {
                window.location.href = "/admin/login";
              }
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#242426] px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-200 transition-colors hover:bg-[#C8FF35] hover:text-[#0B0B0C]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#0B0B0C] text-[#F3F0E9]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#242426] lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-[#242426] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen max-w-full min-w-0 flex-col overflow-x-hidden lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#242426] bg-[#0B0B0C]/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 text-gray-300 hover:bg-[#242426]" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-black uppercase tracking-[0.25em]">DAXUL</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C8FF35]">Studio OS</span>
        </header>
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
