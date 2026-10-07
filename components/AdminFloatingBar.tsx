'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Eye, LogOut } from 'lucide-react';

/**
 * Admin-only quick bar. Rendered nowhere on the customer storefront (it only
 * shows on /admin routes, never links customers to the admin area). The
 * previous "reset to defaults" mock-data control was removed: all data now
 * lives in PostgreSQL.
 */
export default function AdminFloatingBar() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  if (!isAdminPage || pathname?.startsWith('/admin/login')) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-daxul-dark/95 backdrop-blur-md border border-daxul-graphite p-2 rounded-full shadow-2xl">
      <Link
        href="/"
        className="flex items-center gap-1.5 bg-daxul-lime text-daxul-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>View Live Store</span>
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/admin/login' })}
        title="Sign out"
        className="p-2 text-gray-400 hover:text-daxul-lime hover:bg-daxul-graphite rounded-full transition-colors"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
