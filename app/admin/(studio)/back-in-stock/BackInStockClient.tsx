"use client";

import React, { useState } from "react";
import { Bell, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Panel, StatCard, EmptyState } from "@/components/admin/shell/ui";

interface BackInStockItem {
  id: string;
  productId: string;
  variantId: string | null;
  email: string;
  phone: string | null;
  status: "PENDING" | "NOTIFIED" | "CANCELLED";
  notifiedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    stock: number;
    trackInventory: boolean;
  };
}

export default function BackInStockClient({
  initialItems,
}: {
  initialItems: BackInStockItem[];
}) {
  const [items, setItems] = useState<BackInStockItem[]>(initialItems);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const notifiedCount = items.filter((i) => i.status === "NOTIFIED").length;

  // Group by product
  const grouped = React.useMemo(() => {
    const map = new Map<string, { product: BackInStockItem["product"]; pending: number; total: number; subscribers: BackInStockItem[] }>();
    for (const item of items) {
      const pid = item.productId;
      const ex = map.get(pid);
      if (ex) {
        ex.total++;
        if (item.status === "PENDING") ex.pending++;
        ex.subscribers.push(item);
      } else {
        map.set(pid, {
          product: item.product,
          pending: item.status === "PENDING" ? 1 : 0,
          total: 1,
          subscribers: [item],
        });
      }
    }
    return Array.from(map.values());
  }, [items]);

  const handleNotify = async (productId: string) => {
    setLoading((p) => ({ ...p, [productId]: true }));
    setMessage(null);
    try {
      const res = await fetch("/api/admin/back-in-stock/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to notify subscribers");

      setMessage(`✓ ${data.message}`);
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.status === "PENDING"
            ? { ...i, status: "NOTIFIED", notifiedAt: new Date().toISOString() }
            : i
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading((p) => ({ ...p, [productId]: false }));
    }
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard accent label="Pending Notifications" value={pendingCount} hint="Subscribers waiting" />
        <StatCard label="Notified Subscribers" value={notifiedCount} hint="Alerts delivered" />
        <StatCard label="Total Requests" value={items.length} />
      </div>

      {message && (
        <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Demand by Object */}
      <Panel title="Back-in-Stock Demand by Object">
        {grouped.length === 0 ? (
          <EmptyState>No back-in-stock subscriptions logged yet.</EmptyState>
        ) : (
          <div className="divide-y divide-[#242426]">
            {grouped.map((g) => (
              <div
                key={g.product.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">{g.product.name}</h4>
                  <div className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-3">
                    <span>
                      Current Stock:{" "}
                      <span className={g.product.stock > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {g.product.stock} units
                      </span>
                    </span>
                    <span>•</span>
                    <span>
                      Pending Alerts: <span className="text-white font-bold">{g.pending}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => handleNotify(g.product.id)}
                    disabled={g.pending === 0 || g.product.stock <= 0 || loading[g.product.id]}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C8FF35] hover:bg-[#bcf82a] text-[#0B0B0C] text-xs font-bold uppercase rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading[g.product.id] ? "Dispatching..." : "Notify Subscribers"}</span>
                  </button>
                  {g.product.stock <= 0 && g.pending > 0 && (
                    <div className="text-[10px] text-amber-400 font-mono mt-1 text-right">
                      Restock object to notify
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
