import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  PageHeader,
  Panel,
  EmptyState,
  StatCard,
  fmtDate,
  tableCls,
  thCls,
  tdCls,
} from "@/components/admin/shell/ui";
import ProductionTicketActions from "./ProductionTicketActions";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const [tickets, printers] = await Promise.all([
    prisma.productionJobTicket.findMany({
      include: {
        order: {
          select: { id: true, orderNumber: true, customerName: true, status: true },
        },
        orderItem: {
          select: {
            productName: true,
            productImage: true,
            quantity: true,
            selectedFinish: true,
            selectedColor: true,
            selectedSize: true,
            customizations: true,
          },
        },
        printer: {
          select: { id: true, name: true, model: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.printer.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const queued = tickets.filter((t) => t.status === "QUEUED").length;
  const printing = tickets.filter((t) => t.status === "PRINTING").length;
  const qc = tickets.filter((t) => t.status === "QC").length;
  const done = tickets.filter((t) => t.status === "DONE").length;

  return (
    <>
      <PageHeader
        title="Production & QC Desk"
        subtitle="Track fabrication job tickets, printer queue, and quality control checklists."
      />

      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Queued Jobs" value={queued} hint="Awaiting printer assignment" />
          <StatCard label="Active Printing" value={printing} hint="Currently in fabrication" accent />
          <StatCard label="Quality Control" value={qc} hint="Awaiting inspection checklist" />
          <StatCard label="Completed" value={done} hint="Passed QC inspection" />
        </div>

        {/* 3D Printer Fleet Status */}
        <Panel title={`Printer Fleet (${printers.length} Machines)`}>
          {printers.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No printers configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {printers.map((p) => {
                const statusColor =
                  p.status === "PRINTING"
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                    : p.status === "AVAILABLE"
                    ? "bg-[#C8FF35]/10 border-[#C8FF35]/30 text-[#C8FF35]"
                    : "bg-red-500/10 border-red-500/30 text-red-400";
                return (
                  <div key={p.id} className="p-3 rounded-lg border border-[#242426] bg-[#0B0B0C] space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-[#F3F0E9]">{p.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${statusColor}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">{p.model}</p>
                    {p.location && <p className="text-[10px] text-gray-600">Loc: {p.location}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Job Tickets Table */}
        <Panel title={`Active Production Tickets (${tickets.length})`}>
          {tickets.length === 0 ? (
            <EmptyState>No production job tickets created yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Ticket & Order</th>
                    <th className={thCls}>Object / Variant</th>
                    <th className={thCls}>Material & Color</th>
                    <th className={thCls}>Printer</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}>QC Checklist</th>
                    <th className={thCls}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {tickets.map((t) => {
                    const checklist = Array.isArray(t.qcChecklist) ? (t.qcChecklist as any[]) : [];
                    const passedCount = checklist.filter((c) => c.passed).length;

                    return (
                      <tr key={t.id} className="hover:bg-[#1C1C1E]/60 transition-colors">
                        <td className={tdCls}>
                          <div className="font-mono font-bold text-xs text-[#C8FF35]">{t.ticketNumber}</div>
                          <Link
                            href={`/admin/orders/${t.order.id}`}
                            className="text-[11px] text-gray-400 hover:text-white underline"
                          >
                            Order #{t.order.orderNumber}
                          </Link>
                          <div className="text-[10px] text-gray-500">{t.order.customerName}</div>
                        </td>
                        <td className={tdCls}>
                          <div className="font-semibold text-xs text-[#F3F0E9]">{t.orderItem.productName}</div>
                          <div className="text-[10px] text-gray-500">
                            {[t.orderItem.selectedFinish, t.orderItem.selectedColor, t.orderItem.selectedSize]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="text-xs text-gray-300">{t.material || "PLA Standard"}</div>
                          <div className="text-[11px] text-gray-500">{t.color || "Default"}</div>
                        </td>
                        <td className={tdCls}>
                          <div className="text-xs text-gray-300">{t.printer?.name || "Unassigned"}</div>
                          {t.operator && <div className="text-[10px] text-gray-500">Op: {t.operator}</div>}
                        </td>
                        <td className={tdCls}>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              t.status === "DONE"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : t.status === "PRINTING"
                                ? "bg-purple-500/15 text-purple-300"
                                : t.status === "QC"
                                ? "bg-cyan-500/15 text-cyan-300"
                                : t.status === "FAILED"
                                ? "bg-red-500/15 text-red-300"
                                : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <div className="text-xs font-mono text-gray-300">
                            {checklist.length > 0 ? `${passedCount}/${checklist.length} Passed` : "None"}
                          </div>
                          {t.qcNotes && <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{t.qcNotes}</div>}
                        </td>
                        <td className={tdCls}>
                          <ProductionTicketActions
                            ticketId={t.id}
                            currentStatus={t.status}
                            printers={printers}
                            currentPrinterId={t.printerId}
                            checklist={checklist}
                          />
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
