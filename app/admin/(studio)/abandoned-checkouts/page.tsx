import React from "react";
import { prisma } from "@/lib/db";
import {
  PageHeader,
  Panel,
  EmptyState,
  StatCard,
  inr,
  fmtDate,
  tableCls,
  thCls,
  tdCls,
} from "@/components/admin/shell/ui";

export const dynamic = "force-dynamic";

export default async function AbandonedCheckoutsPage() {
  const checkouts = await prisma.abandonedCheckout.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const totalSessions = checkouts.length;
  const openSessions = checkouts.filter((c) => !c.isRecovered);
  const recoveredSessions = checkouts.filter((c) => c.isRecovered);
  const openValue = openSessions.reduce((s, c) => s + c.subtotal, 0);
  const recoveredValue = recoveredSessions.reduce((s, c) => s + c.subtotal, 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://daxullabs.com";

  return (
    <>
      <PageHeader
        title="Abandoned Checkouts"
        subtitle="Track customer sessions that dropped off before payment and send recovery links."
      />

      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Open Sessions" value={openSessions.length} hint="Unrecovered carts" />
          <StatCard label="Potential Revenue" value={inr(openValue)} hint="In dropped checkouts" accent />
          <StatCard label="Recovered Orders" value={recoveredSessions.length} hint="Converted to purchases" />
          <StatCard label="Recovered Revenue" value={inr(recoveredValue)} hint="Captured sales" />
        </div>

        <Panel title={`Recent Checkout Sessions (${totalSessions})`}>
          {checkouts.length === 0 ? (
            <EmptyState>No abandoned checkouts recorded yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Customer</th>
                    <th className={thCls}>Cart Items</th>
                    <th className={thCls}>Value</th>
                    <th className={thCls}>Last Step</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}>Last Active</th>
                    <th className={thCls}>Recovery Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {checkouts.map((c) => {
                    const items = Array.isArray(c.items) ? (c.items as any[]) : [];
                    const summary = items
                      .map((i) => `${i.quantity || 1}× ${i.name || i.productName || "Item"}`)
                      .join(", ");
                    const recoveryUrl = `${appUrl}/checkout?recover=${c.recoveryToken}`;

                    return (
                      <tr key={c.id} className="hover:bg-[#1C1C1E]/60 transition-colors">
                        <td className={tdCls}>
                          <div className="font-semibold text-[#F3F0E9]">
                            {c.customerName || c.email || "Anonymous Guest"}
                          </div>
                          {c.email && <div className="text-[11px] text-gray-400">{c.email}</div>}
                          {c.phone && <div className="text-[11px] text-gray-500 font-mono">{c.phone}</div>}
                        </td>
                        <td className={tdCls}>
                          <div className="max-w-xs truncate text-xs text-gray-300" title={summary}>
                            {summary || "Cart Items"}
                          </div>
                          <div className="text-[10px] text-gray-500">{items.length} line item(s)</div>
                        </td>
                        <td className={`${tdCls} font-mono font-bold text-[#F3F0E9]`}>
                          {inr(c.subtotal)}
                        </td>
                        <td className={tdCls}>
                          <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#242426] text-gray-300">
                            {c.currentStep}
                          </span>
                        </td>
                        <td className={tdCls}>
                          {c.isRecovered ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              ● Converted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                              ● Open
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-[11px] text-gray-400 font-mono`}>
                          {fmtDate(c.updatedAt)}
                        </td>
                        <td className={tdCls}>
                          <a
                            href={recoveryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded bg-[#C8FF35]/10 hover:bg-[#C8FF35]/20 text-[#C8FF35] border border-[#C8FF35]/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors"
                          >
                            Copy Link
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
