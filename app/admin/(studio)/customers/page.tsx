import Link from "next/link";
import { listCustomers } from "@/lib/adminQueries";
import { PageHeader, Panel, EmptyState, Pagination, inr, fmtDay, tableCls, thCls, tdCls, inputCls, btnPrimary } from "@/components/admin/shell/ui";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const page = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const { total, pageSize, customers } = await listCustomers({ search: q, page });
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Customers" subtitle="Derived from orders, grouped by email." />
      <div className="space-y-4 px-4 py-6 sm:px-8">
        <form action="/admin/customers" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, email, phone" className={inputCls} />
          <button className={btnPrimary} type="submit">Search</button>
        </form>
        <Panel>
          {customers.length === 0 ? (
            <EmptyState>No customers yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr><th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Phone</th><th className={thCls}>Orders</th><th className={thCls}>Lifetime value</th><th className={thCls}>Last order</th></tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {customers.map((c) => (
                    <tr key={c.email} className="hover:bg-[#242426]/30">
                      <td className={tdCls}><Link className="font-semibold text-[#C8FF35] hover:underline" href={`/admin/customers/${encodeURIComponent(c.email)}`}>{c.name}</Link></td>
                      <td className={tdCls}>{c.email}</td>
                      <td className={tdCls}>{c.phone}</td>
                      <td className={`${tdCls} tabular-nums`}>{c.orders}</td>
                      <td className={`${tdCls} tabular-nums`}>{inr(c.ltv)}</td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-gray-400`}>{fmtDay(c.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} total={total} pageSize={pageSize} hrefFor={href} />
        </Panel>
      </div>
    </>
  );
}
