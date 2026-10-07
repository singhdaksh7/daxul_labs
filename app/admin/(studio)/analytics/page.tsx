import Link from "next/link";
import { getAnalytics } from "@/lib/adminQueries";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orderPipeline";
import { PageHeader, Panel, StatCard, EmptyState, BarChart, HBars, inr } from "@/components/admin/shell/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const granularity = sp.granularity === "monthly" ? "monthly" : "daily";
  const a = await getAnalytics(granularity);
  const hasSeries = a.series.some((s) => s.orders > 0);
  const tab = (g: string) =>
    `rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${g === granularity ? "border-[#C8FF35] bg-[#C8FF35] text-[#0B0B0C]" : "border-[#242426] text-gray-400 hover:text-white"}`;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Revenue counts paid, non-cancelled orders. Dates in IST."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/analytics?granularity=daily" className={tab("daily")}>Daily · 30d</Link>
            <Link href="/admin/analytics?granularity=monthly" className={tab("monthly")}>Monthly · 12m</Link>
          </div>
        }
      />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard accent label="Total revenue" value={inr(a.totalRevenue)} />
          <StatCard label="Paid orders" value={a.paidOrders} />
          <StatCard label="Average order value" value={inr(a.averageOrderValue)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={`Revenue (${granularity})`}>
            {hasSeries ? <BarChart data={a.series.map((s) => ({ label: s.label, value: s.revenue }))} format={inr} /> : <EmptyState>No orders in this period.</EmptyState>}
          </Panel>
          <Panel title={`Orders (${granularity})`}>
            {hasSeries ? <BarChart data={a.series.map((s) => ({ label: s.label, value: s.orders }))} /> : <EmptyState>No orders in this period.</EmptyState>}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Best-selling products">
            {a.bestSellers.length === 0 ? <EmptyState>No sales yet.</EmptyState> : <HBars data={a.bestSellers.map((b) => ({ label: b.name, value: b.quantity }))} format={(n) => `${n} sold`} />}
          </Panel>
          <Panel title="Payment method split">
            {a.paymentSplit.length === 0 ? <EmptyState>No orders yet.</EmptyState> : (
              <HBars data={a.paymentSplit.map((p) => ({ label: `${p.method.toUpperCase()} · ${inr(p.amount)}`, value: p.orders }))} format={(n) => `${n} orders`} />
            )}
          </Panel>
          <Panel title="Manufacturing status">
            {a.statusDistribution.length === 0 ? <EmptyState>No orders yet.</EmptyState> : (
              <HBars data={a.statusDistribution.map((s) => ({ label: STATUS_LABELS[s.status as OrderStatus] ?? s.status, value: s.count }))} />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
