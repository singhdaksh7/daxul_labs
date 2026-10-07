import Link from "next/link";
import { listOrders, listPipelineOrders } from "@/lib/adminQueries";
import { ORDER_FILTERS, PIPELINE, STATUS_LABELS, type OrderFilter, type OrderStatus } from "@/lib/orderPipeline";
import {
  PageHeader, Panel, EmptyState, Badge, StatusBadge, Pagination, inr, fmtDate,
  tableCls, thCls, tdCls, inputCls, btnPrimary,
} from "@/components/admin/shell/ui";
import MoveButtons from "./MoveButtons";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function summarize(values: unknown): string {
  if (!values || typeof values !== "object") return "";
  return Object.entries(values as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${typeof v === "string" && /^(https?:\/\/|\/)/.test(v) ? "[file]" : String(v)}`)
    .join(" · ")
    .slice(0, 140);
}

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = one(sp.view);

  if (view === "manufacturing" || view === "customizations") {
    const orders = await listPipelineOrders(view);
    return (
      <>
        <PageHeader
          title={view === "manufacturing" ? "Manufacturing pipeline" : "Customizations"}
          subtitle={view === "manufacturing" ? "Move orders one step at a time through production." : "Orders containing customizable items."}
          actions={<Link href="/admin/orders" className="text-xs text-[#C8FF35] hover:underline">All orders</Link>}
        />
        <div className="px-4 py-6 sm:px-8">
          {orders.length === 0 ? (
            <EmptyState>No orders in this view yet.</EmptyState>
          ) : view === "manufacturing" ? (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {PIPELINE.map((status) => {
                const col = orders.filter((o) => o.status === status);
                return (
                  <div key={status} className="w-64 shrink-0 rounded-xl border border-[#242426] bg-[#151515]">
                    <div className="flex items-center justify-between border-b border-[#242426] px-3 py-2.5">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-300">{STATUS_LABELS[status]}</h3>
                      <span className="rounded-full bg-[#242426] px-2 text-[10px] font-bold text-[#C8FF35]">{col.length}</span>
                    </div>
                    <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                      {col.length === 0 && <p className="px-2 py-4 text-center text-xs text-gray-600">Empty</p>}
                      {col.map((o) => (
                        <div key={o.id} className="space-y-2 rounded-lg border border-[#242426] bg-[#0B0B0C] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Link href={`/admin/orders/${o.id}`} className="text-xs font-bold text-[#C8FF35] hover:underline">{o.orderNumber}</Link>
                            <Badge kind={o.paymentMethod} />
                          </div>
                          <p className="truncate text-xs text-gray-300">{o.customerName}</p>
                          <p className="truncate text-[11px] text-gray-500">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</p>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="tabular-nums">{inr(o.totalAmount)}</span>
                            {o.uploadCount > 0 && <span className="text-amber-300">{o.uploadCount} file{o.uploadCount > 1 ? "s" : ""}</span>}
                          </div>
                          <MoveButtons orderId={o.id} status={o.status as OrderStatus} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {orders.map((o) => (
                <Panel key={o.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-[#C8FF35] hover:underline">{o.orderNumber}</Link>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-300">{o.customerName} · <span className="text-gray-500">{fmtDate(o.createdAt)}</span></p>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-400">
                    {o.items.filter((i) => i.customizations || i.customizationFee > 0).map((i) => (
                      <li key={i.id}><span className="text-gray-200">{i.quantity}× {i.productName}</span> {summarize(i.customizations)}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">{o.uploadCount} uploaded file{o.uploadCount === 1 ? "" : "s"}</span>
                    <div className="w-48"><MoveButtons orderId={o.id} status={o.status as OrderStatus} /></div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  const fRaw = one(sp.filter) ?? "all";
  const filter: OrderFilter = (ORDER_FILTERS as readonly string[]).includes(fRaw) ? (fRaw as OrderFilter) : "all";
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const page = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const { total, pageSize, orders } = await listOrders({ filter, search: q, page });

  const href = (over: { filter?: string; page?: number }) => {
    const p = new URLSearchParams();
    const f = over.filter ?? filter;
    if (f !== "all") p.set("filter", f);
    if (q) p.set("q", q);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Every order, straight from PostgreSQL." />
      <div className="space-y-4 px-4 py-6 sm:px-8">
        <form action="/admin/orders" className="flex gap-2">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <input name="q" defaultValue={q} placeholder="Search order #, name, email, phone" className={inputCls} />
          <button className={btnPrimary} type="submit">Search</button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {ORDER_FILTERS.map((f) => (
            <Link
              key={f}
              href={href({ filter: f })}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                f === filter ? "border-[#C8FF35] bg-[#C8FF35] text-[#0B0B0C]" : "border-[#242426] text-gray-400 hover:border-[#C8FF35]/50 hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f === "cod" ? "COD" : f.replace("_", " ")}
            </Link>
          ))}
        </div>
        <Panel>
          {orders.length === 0 ? (
            <EmptyState>No orders match.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Order</th><th className={thCls}>Customer</th><th className={thCls}>Amount</th>
                    <th className={thCls}>Payment</th><th className={thCls}>Manufacturing</th><th className={thCls}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#242426]/30">
                      <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-[#C8FF35] hover:underline">{o.orderNumber}</Link></td>
                      <td className={tdCls}>{o.customerName}<div className="text-xs text-gray-500">{o.customerEmail}</div></td>
                      <td className={`${tdCls} tabular-nums`}>{inr(o.totalAmount)}</td>
                      <td className={tdCls}><div className="flex gap-1"><Badge kind={o.paymentStatus} /><Badge kind={o.paymentMethod} /></div></td>
                      <td className={tdCls}><StatusBadge status={o.status} /></td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-gray-400`}>{fmtDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} total={total} pageSize={pageSize} hrefFor={(p) => href({ page: p })} />
        </Panel>
      </div>
    </>
  );
}
