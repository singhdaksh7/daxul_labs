import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/adminQueries";
import { PageHeader, Panel, StatCard, EmptyState, Badge, StatusBadge, inr, fmtDate, tableCls, thCls, tdCls } from "@/components/admin/shell/ui";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  let decoded = email;
  try { decoded = decodeURIComponent(email); } catch { /* keep raw */ }
  const c = await getCustomerDetail(decoded);
  if (!c) notFound();

  return (
    <>
      <PageHeader title={c.name} subtitle={`${c.email} · ${c.phone}`} actions={<Link href="/admin/customers" className="text-xs text-[#C8FF35] hover:underline">← All customers</Link>} />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Orders" value={c.orders.length} />
          <StatCard accent label="Lifetime value" value={inr(c.lifetimeValue)} hint="Paid, non-cancelled" />
          <StatCard label="Addresses" value={c.addresses.length} />
          <StatCard label="Customizations" value={c.customizations.length} />
        </div>

        <Panel title="Orders">
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr><th className={thCls}>Order</th><th className={thCls}>Amount</th><th className={thCls}>Payment</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr></thead>
              <tbody className="divide-y divide-[#242426]">
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-[#C8FF35] hover:underline">{o.orderNumber}</Link></td>
                    <td className={`${tdCls} tabular-nums`}>{inr(o.totalAmount)}</td>
                    <td className={tdCls}><Badge kind={o.paymentStatus} /></td>
                    <td className={tdCls}><StatusBadge status={o.status} /></td>
                    <td className={`${tdCls} whitespace-nowrap text-xs text-gray-400`}>{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Addresses">
            {c.addresses.length === 0 ? <EmptyState>None.</EmptyState> : (
              <ul className="space-y-3">
                {c.addresses.map((a, i) => (
                  <li key={i} className="text-sm text-gray-300">{a.street}, {a.city}, {a.state} {a.pincode}, {a.country}</li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Customization history">
            {c.customizations.length === 0 ? <EmptyState>No customized items.</EmptyState> : (
              <ul className="space-y-3">
                {c.customizations.map((x, i) => (
                  <li key={i} className="text-sm">
                    <Link href={`/admin/orders/${x.orderId}`} className="font-semibold text-[#C8FF35] hover:underline">{x.orderNumber}</Link>
                    <span className="ml-2 text-gray-300">{x.productName}</span>
                    <p className="text-xs text-gray-500">
                      {Object.entries(x.values).map(([k, v]) => `${k}: ${typeof v === "string" && /^(https?:\/\/|\/)/.test(v) ? "[uploaded file]" : String(v)}`).join(" · ")}
                    </p>
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
