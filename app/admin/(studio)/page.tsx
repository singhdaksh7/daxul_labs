import Link from "next/link";
import { getDashboardData } from "@/lib/adminQueries";
import { PIPELINE, STATUS_LABELS } from "@/lib/orderPipeline";
import {
  PageHeader, Panel, StatCard, EmptyState, StatusBadge, Badge, HBars, inr, fmtDate,
  tableCls, thCls, tdCls,
} from "@/components/admin/shell/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboardData();
  const prod = ["printing", "finishing", "qc", "packed", "shipped", "delivered"] as const;
  const queue = PIPELINE.map((s) => ({ label: STATUS_LABELS[s], value: d.statusCounts[s] ?? 0 }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live figures from the production database." />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard accent label="Revenue (paid)" value={inr(d.revenue)} hint={`${d.paidCount} paid orders`} />
          <StatCard label="Orders today" value={d.ordersToday} />
          <StatCard label="Orders this month" value={d.ordersMonth} />
          <StatCard label="Avg order value" value={inr(d.averageOrderValue)} />
          <StatCard label="Pending orders" value={d.pendingOrders} hint="New + design pending" />
          <StatCard label="Pending customizations" value={d.pendingCustomizations} hint="Custom items awaiting design" />
          <StatCard label="Customers" value={d.totalCustomers} hint="Distinct emails" />
          <StatCard label="Low stock" value={d.lowStock.length} hint="At or below threshold" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {prod.map((s) => (
            <Link key={s} href={`/admin/orders?filter=${s}`} className="rounded-xl border border-[#242426] bg-[#151515] p-4 transition-colors hover:border-[#C8FF35]/50">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{STATUS_LABELS[s]}</p>
              <p className="mt-2 text-2xl font-black tabular-nums text-[#F3F0E9]">{d.statusCounts[s] ?? 0}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel title="Recent orders" className="xl:col-span-2" action={<Link href="/admin/orders" className="text-xs text-[#C8FF35] hover:underline">View all</Link>}>
            {d.recentOrders.length === 0 ? (
              <EmptyState>No orders yet.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className={tableCls}>
                  <thead>
                    <tr><th className={thCls}>Order</th><th className={thCls}>Customer</th><th className={thCls}>Amount</th><th className={thCls}>Payment</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#242426]">
                    {d.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#242426]/30">
                        <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-[#C8FF35] hover:underline">{o.orderNumber}</Link></td>
                        <td className={tdCls}>{o.customerName}</td>
                        <td className={`${tdCls} tabular-nums`}>{inr(o.totalAmount)}</td>
                        <td className={tdCls}><Badge kind={o.paymentStatus} /></td>
                        <td className={tdCls}><StatusBadge status={o.status} /></td>
                        <td className={`${tdCls} whitespace-nowrap text-xs text-gray-400`}>{fmtDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Top products">
            {d.topProducts.length === 0 ? (
              <EmptyState>No sales yet.</EmptyState>
            ) : (
              <HBars data={d.topProducts.map((p) => ({ label: p.name, value: p.quantity }))} format={(n) => `${n} sold`} />
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Production queue" action={<Link href="/admin/orders?view=manufacturing" className="text-xs text-[#C8FF35] hover:underline">Open pipeline</Link>}>
            {queue.every((q) => q.value === 0) ? <EmptyState>Production queue is empty.</EmptyState> : <HBars data={queue} />}
          </Panel>

          <Panel title="Low-stock alerts" action={<Link href="/admin/inventory" className="text-xs text-[#C8FF35] hover:underline">Inventory</Link>}>
            {d.lowStock.length === 0 ? (
              <EmptyState>No low-stock products.</EmptyState>
            ) : (
              <ul className="divide-y divide-[#242426]">
                {d.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate text-gray-200">{p.name}{p.sku ? <span className="ml-2 text-xs text-gray-500">{p.sku}</span> : null}</span>
                    <span className={`shrink-0 text-xs font-bold tabular-nums ${p.stock <= 0 ? "text-red-400" : "text-amber-300"}`}>
                      {p.stock} left (min {p.lowStockThreshold})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
