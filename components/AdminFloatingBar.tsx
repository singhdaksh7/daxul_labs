"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/storeContext';
import { Settings, Eye, RotateCcw, AlertCircle, ShoppingBag, ShieldCheck, Sparkles } from 'lucide-react';

export default function AdminFloatingBar() {
  const pathname = usePathname();
  const { resetAllToDefault, orders, products, siteSettings } = useStore();
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const isAdminPage = pathname?.startsWith('/admin');

  // Business metrics count for quick bar
  const pendingOrders = orders.filter((o) => o.status === 'new' || o.status === 'design_pending').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#151515]/95 backdrop-blur-md border border-[#242426] p-2 rounded-full shadow-2xl transition-all hover:border-[#C8FF35]/50 group">
      
      {/* Live Status indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B0B0C] text-xs font-semibold uppercase tracking-wider text-gray-300">
        <span className="w-2 h-2 rounded-full bg-[#C8FF35] animate-ping" />
        <span className="hidden sm:inline">DAXUL OS</span>
        {pendingOrders > 0 && (
          <span className="bg-[#C8FF35] text-[#0B0B0C] px-1.5 py-0.5 rounded-full text-[10px] font-extrabold">
            {pendingOrders} NEW
          </span>
        )}
      </div>

      {/* Admin toggle link */}
      {isAdminPage ? (
        <Link
          href="/"
          className="flex items-center gap-1.5 bg-[#C8FF35] text-[#0B0B0C] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Live Store</span>
        </Link>
      ) : (
        <Link
          href="/admin"
          className="flex items-center gap-1.5 bg-[#242426] hover:bg-[#C8FF35] text-white hover:text-[#0B0B0C] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Admin Dashboard</span>
        </Link>
      )}

      {/* Reset button */}
      <button
        onClick={() => setShowConfirmReset(true)}
        title="Reset to original DAXUL LABS default data"
        className="p-2 text-gray-400 hover:text-[#C8FF35] hover:bg-[#242426] rounded-full transition-colors"
        aria-label="Reset to Default"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#C8FF35]">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">Reset Store Defaults?</h3>
            </div>
            <p className="text-sm text-gray-300">
              This will restore all products, prices, homepage sections, custom fields, theme settings, and orders back to the original DAXUL LABS brand design.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 bg-[#242426] text-gray-300 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAllToDefault();
                  setShowConfirmReset(false);
                }}
                className="px-4 py-2 bg-[#C8FF35] text-[#0B0B0C] rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
