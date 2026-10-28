import React from "react";
import Link from "next/link";
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

export default async function PaymentsReconciliationPage() {
  const [orders, transactions] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const txByPaymentId = new Map(transactions.map((t) => [t.gatewayPaymentId, t]));
  const txByOrderId = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const list = txByOrderId.get(t.orderId) || [];
    list.push(t);
    txByOrderId.set(t.orderId, list);
  }

  // Reconciliation analysis
  let suspiciousCount = 0;
  let reconciledCount = 0;
  let totalCaptured = 0;

  const rows = orders.map((o) => {
    const matchedTx = o.razorpayPaymentId ? txByPaymentId.get(o.razorpayPaymentId) : null;
    const paidAmount = matchedTx ? matchedTx.amount : o.paymentStatus === "paid" ? o.totalAmount : 0;
    if (o.paymentStatus === "paid") totalCaptured += o.totalAmount;

    let statusType: "RECONCILED" | "PENDING" | "UNCONFIRMED_PAID" | "GATEWAY_PAID_ORDER_PENDING" | "MISMATCH";
    let statusLabel = "Reconciled";
    let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

    if (o.paymentMethod === "cod") {
      statusType = o.paymentStatus === "paid" ? "RECONCILED" : "PENDING";
      statusLabel = o.paymentStatus === "paid" ? "COD Collected" : "COD Pending";
      statusColor = o.paymentStatus === "paid" ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400 bg-gray-800";
    } else if (o.paymentStatus === "paid" && o.razorpayPaymentId) {
      if (matchedTx && Math.abs(matchedTx.amount - o.totalAmount) > 0.05) {
        statusType = "MISMATCH";
        statusLabel = "Amount Mismatch";
        statusColor = "text-red-400 bg-red-500/10 border-red-500/20";
        suspiciousCount++;
      } else {
        statusType = "RECONCILED";
        statusLabel = "Gateway Verified";
        statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        reconciledCount++;
      }
    } else if (o.paymentStatus === "paid" && !o.razorpayPaymentId) {
      statusType = "UNCONFIRMED_PAID";
      statusLabel = "Unconfirmed Paid";
      statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
      suspiciousCount++;
    } else if (o.paymentStatus === "pending" && matchedTx && matchedTx.status === "captured") {
      statusType = "GATEWAY_PAID_ORDER_PENDING";
      statusLabel = "Paid on Gateway, Order Pending";
      statusColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
      suspiciousCount++;
    } else {
      statusType = "PENDING";
      statusLabel = "Awaiting Payment";
      statusColor = "text-gray-400 bg-gray-800";
    }

    return {
      order: o,
      paidAmount,
      matchedTx,
      statusType,
      statusLabel,
      statusColor,
    };
  });

  return (
    <>
      <PageHeader
        title="Payment Reconciliation"
        subtitle="Cross-verify order totals against Razorpay gateway settlement records to detect payment discrepancies."
      />

      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total Collected" value={inr(totalCaptured)} hint="Across all verified orders" accent />
          <StatCard label="Reconciled Orders" value={reconciledCount} hint="Matching gateway settlements" />
          <StatCard
            label="Discrepancies Flagged"
            value={suspiciousCount}
            hint={suspiciousCount > 0 ? "Requires manual audit" : "All records reconciled"}
          />
          <StatCard label="Total Orders" value={orders.length} hint="Latest active order records" />
        </div>

        <Panel title={`Reconciliation Ledger (${orders.length} Orders)`}>
          {orders.length === 0 ? (
            <EmptyState>No payment records available.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Order</th>
                    <th className={thCls}>Customer</th>
                    <th className={thCls}>Expected Amount</th>
                    <th className={thCls}>Paid Amount</th>
                    <th className={thCls}>Method & Gateway ID</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}>Placed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {rows.map(({ order, paidAmount, matchedTx, statusLabel, statusColor }) => (
                    <tr key={order.id} className="hover:bg-[#1C1C1E]/60 transition-colors">
                      <td className={tdCls}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-bold text-xs text-[#C8FF35] hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className={tdCls}>
                        <div className="text-xs font-semibold text-[#F3F0E9]">{order.customerName}</div>
                        <div className="text-[11px] text-gray-500">{order.customerEmail}</div>
                      </td>
                      <td className={`${tdCls} font-mono font-bold text-[#F3F0E9]`}>
                        {inr(order.totalAmount)}
                      </td>
                      <td className={`${tdCls} font-mono font-bold ${paidAmount > 0 ? "text-emerald-400" : "text-gray-500"}`}>
                        {inr(paidAmount)}
                      </td>
                      <td className={tdCls}>
                        <div className="text-xs font-bold uppercase text-gray-300">{order.paymentMethod}</div>
                        {order.razorpayPaymentId ? (
                          <div className="text-[10px] font-mono text-gray-500 truncate max-w-[140px]">
                            {order.razorpayPaymentId}
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-600">None</div>
                        )}
                      </td>
                      <td className={tdCls}>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className={`${tdCls} text-[11px] text-gray-400 font-mono`}>
                        {fmtDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
