import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail, safeFilenameFromUrl } from "@/lib/adminQueries";
import type { OrderStatus } from "@/lib/orderPipeline";
import { PageHeader, Panel, Badge, StatusBadge, EmptyState, inr, fmtDate } from "@/components/admin/shell/ui";
import OrderActions from "./OrderActions";

export const dynamic = "force-dynamic";

const trunc = (v?: string | null) => (v ? (v.length > 12 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v) : "—");
const fileSrc = (name: string) => `/api/uploads/file/${encodeURIComponent(name)}`;
const isImg = (name: string, mime?: string) => (mime ? mime.startsWith("image/") : /\.(png|jpe?g|webp|gif|svg)$/i.test(name));

function Artwork({ name, label, mime }: { name: string; label: string; mime?: string }) {
  const src = fileSrc(name);
  const pdf = mime ? mime === "application/pdf" : /\.pdf$/i.test(name);
  return (
    <div className="w-40 space-y-1.5">
      {isImg(name, mime) ? (
        <a href={src} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="h-32 w-40 rounded-lg border border-[#242426] bg-[#0B0B0C] object-contain" />
        </a>
      ) : pdf ? (
        <embed src={src} type="application/pdf" className="h-32 w-40 rounded-lg border border-[#242426]" />
      ) : (
        <a href={src} target="_blank" rel="noreferrer" className="flex h-32 w-40 items-center justify-center rounded-lg border border-[#242426] text-xs text-[#C8FF35]">Open file</a>
      )}
      <p className="truncate text-[11px] text-gray-400" title={label}>{label}</p>
      <a href={src} target="_blank" rel="noreferrer" className="text-[11px] text-[#C8FF35] hover:underline">Open</a>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getOrderDetail(id);
  if (!detail) notFound();
  const { order, files } = detail;

  const subtotal = order.items.reduce((s, i) => s + (i.unitPrice + i.customizationFee) * i.quantity, 0);
  const knownNames = new Set(files.map((f) => f.filename));

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`Placed ${fmtDate(order.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <Badge kind={order.paymentStatus} />
            <Badge kind={order.paymentMethod} />
          </div>
        }
      />
      <div className="space-y-2 px-4 pt-4 sm:px-8"><Link href="/admin/orders" className="text-xs text-[#C8FF35] hover:underline">← All orders</Link></div>
      <div className="grid gap-6 px-4 py-6 sm:px-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Items">
            <ul className="divide-y divide-[#242426]">
              {order.items.map((it) => {
                const variants = Array.isArray(it.variantSelections) ? (it.variantSelections as { group?: string; variant?: string }[]) : [];
                const customs = it.customizations && typeof it.customizations === "object" ? Object.entries(it.customizations as Record<string, unknown>) : [];
                return (
                  <li key={it.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#F3F0E9]">{it.productName}{it.productSku ? <span className="ml-2 text-xs text-gray-500">{it.productSku}</span> : null}</p>
                        <p className="text-xs text-gray-500">
                          Qty {it.quantity} × {inr(it.unitPrice)}{it.customizationFee > 0 ? ` + ${inr(it.customizationFee)} custom` : ""}
                        </p>
                      </div>
                      <p className="tabular-nums text-sm">{inr((it.unitPrice + it.customizationFee) * it.quantity)}</p>
                    </div>
                    {(it.selectedFinish || it.selectedColor || it.selectedSize || variants.length > 0) && (
                      <p className="text-xs text-gray-400">
                        {[it.selectedFinish && `Finish: ${it.selectedFinish}`, it.selectedColor && `Color: ${it.selectedColor}`, it.selectedSize && `Size: ${it.selectedSize}`, ...variants.map((v) => `${v.group}: ${v.variant}`)].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {customs.length > 0 && (
                      <div className="space-y-2 rounded-lg bg-[#0B0B0C] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Customization</p>
                        {customs.map(([k, v]) => {
                          const fname = typeof v === "string" ? safeFilenameFromUrl(v) : null;
                          if (fname) {
                            return (
                              <div key={k} className="space-y-1">
                                <p className="text-xs text-gray-400">{k}</p>
                                <Artwork name={fname} label={`${k} (${fname})`} />
                              </div>
                            );
                          }
                          return (
                            <p key={k} className="text-sm text-gray-200"><span className="text-gray-500">{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}</p>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Uploaded artwork">
            {files.length === 0 ? (
              <EmptyState>No uploaded files linked to this order.</EmptyState>
            ) : (
              <div className="flex flex-wrap gap-4">
                {files.map((f) => <Artwork key={f.id} name={f.filename} label={f.originalName} mime={f.mimeType} />)}
              </div>
            )}
            {knownNames.size > 0 && <p className="mt-3 text-[11px] text-gray-600">Served through the authenticated file route only.</p>}
          </Panel>

          <Panel title="Status history">
            {order.statusHistory.length === 0 ? (
              <EmptyState>No history recorded.</EmptyState>
            ) : (
              <ol className="relative space-y-4 border-l border-[#242426] pl-5">
                {order.statusHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-[#C8FF35]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-gray-500">{fmtDate(h.timestamp)}</span>
                      {h.adminEmail && <span className="text-xs text-gray-500">by {h.adminEmail}</span>}
                    </div>
                    {h.note && <p className="mt-1 text-sm text-gray-300">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Internal notes"><p className="whitespace-pre-wrap text-sm text-gray-300">{order.internalNotes || <span className="text-gray-600">None</span>}</p></Panel>
            <Panel title="Production / QC notes"><p className="whitespace-pre-wrap text-sm text-gray-300">{order.qcNotes || <span className="text-gray-600">None</span>}</p></Panel>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold">
              <Link href={`/admin/customers/${encodeURIComponent(order.customerEmail.toLowerCase())}`} className="text-[#C8FF35] hover:underline">{order.customerName}</Link>
            </p>
            <p className="text-sm text-gray-300">{order.customerEmail}</p>
            <p className="text-sm text-gray-300">{order.customerPhone}</p>
          </Panel>
          <Panel title="Shipping address">
            <address className="text-sm not-italic leading-relaxed text-gray-300">
              {order.street}<br />{order.city}, {order.state} {order.pincode}<br />{order.country}
            </address>
          </Panel>
          <Panel title="Amount">
            <dl className="space-y-1.5 text-sm">
              <Row k="Subtotal" v={inr(subtotal)} />
              <Row k={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} v={`− ${inr(order.discountAmount)}`} />
              <Row k="Shipping" v={inr(order.shippingFee)} />
              <Row k="COD fee" v={inr(order.codFee)} />
              <div className="mt-2 flex justify-between border-t border-[#242426] pt-2 font-black text-[#C8FF35]"><dt>Total</dt><dd className="tabular-nums">{inr(order.totalAmount)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Payment">
            <dl className="space-y-1.5 text-sm">
              <Row k="Method" v={order.paymentMethod.toUpperCase()} />
              <Row k="Status" v={order.paymentStatus} />
              <Row k="Razorpay order" v={trunc(order.razorpayOrderId)} />
              <Row k="Razorpay payment" v={trunc(order.razorpayPaymentId)} />
            </dl>
          </Panel>
          <Panel title="Shipment">
            <dl className="space-y-1.5 text-sm">
              <Row k="Courier" v={order.courierName || "—"} />
              <Row k="Tracking #" v={order.trackingNumber || "—"} />
              {order.trackingUrl && /^https:\/\//.test(order.trackingUrl) && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer noopener" className="text-xs text-[#C8FF35] hover:underline">Open tracking page</a>
              )}
            </dl>
          </Panel>
          <Panel title="Actions">
            <OrderActions
              orderId={order.id}
              status={order.status as OrderStatus}
              paymentStatus={order.paymentStatus}
              courierName={order.courierName ?? ""}
              trackingNumber={order.trackingNumber ?? ""}
              trackingUrl={order.trackingUrl ?? ""}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-gray-500">{k}</dt><dd className="break-all text-right tabular-nums text-gray-200">{v}</dd></div>;
}
