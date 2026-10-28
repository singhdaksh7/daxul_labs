"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface PrinterOption {
  id: string;
  name: string;
}

interface ChecklistItem {
  item: string;
  passed: boolean;
}

export default function ProductionTicketActions({
  ticketId,
  currentStatus,
  printers,
  currentPrinterId,
  checklist: initialChecklist,
}: {
  ticketId: string;
  currentStatus: string;
  printers: PrinterOption[];
  currentPrinterId?: string | null;
  checklist: ChecklistItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showQcModal, setShowQcModal] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [qcNotes, setQcNotes] = useState("");

  const updateTicket = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/production/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Update failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error updating ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStatus = () => {
    const sequence = ["QUEUED", "PRINTING", "FINISHING", "QC", "DONE"];
    const idx = sequence.indexOf(currentStatus);
    if (idx >= 0 && idx < sequence.length - 1) {
      updateTicket({ status: sequence[idx + 1] });
    }
  };

  const handleFail = () => {
    const reason = prompt("Enter failure reason (e.g. bed adhesion, layer shift, power):");
    if (reason) {
      const grams = prompt("Estimated wasted filament grams:") || "0";
      updateTicket({
        status: "FAILED",
        failureReason: reason,
        actualGrams: parseFloat(grams) || 0,
      });
    }
  };

  const handleSaveQc = async () => {
    await updateTicket({
      qcChecklist: checklist,
      qcNotes: qcNotes || undefined,
      status: checklist.every((c) => c.passed) ? "DONE" : "QC",
    });
    setShowQcModal(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {currentStatus === "QUEUED" && (
        <select
          disabled={loading}
          value={currentPrinterId || ""}
          onChange={(e) => updateTicket({ printerId: e.target.value || null, status: "PRINTING" })}
          className="bg-[#151515] border border-[#242426] text-[11px] text-gray-300 rounded px-2 py-1"
        >
          <option value="">Start Print...</option>
          {printers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {currentStatus !== "DONE" && currentStatus !== "FAILED" && (
        <button
          disabled={loading}
          onClick={handleNextStatus}
          className="bg-[#242426] hover:bg-[#2C2C2E] text-white border border-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
        >
          {currentStatus === "PRINTING" ? "Finish Print" : currentStatus === "FINISHING" ? "Send to QC" : "Advance"}
        </button>
      )}

      {(currentStatus === "FINISHING" || currentStatus === "QC" || currentStatus === "DONE") && (
        <button
          onClick={() => setShowQcModal(true)}
          className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
        >
          QC Check
        </button>
      )}

      {currentStatus === "PRINTING" && (
        <button
          disabled={loading}
          onClick={handleFail}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
        >
          Fail
        </button>
      )}

      {/* QC Modal */}
      {showQcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#151515] border border-[#242426] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#242426] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F0E9]">Quality Control Inspection</h3>
              <button
                onClick={() => setShowQcModal(false)}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2.5 p-2 rounded bg-[#0B0B0C] border border-[#242426] cursor-pointer hover:border-gray-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.passed}
                    onChange={(e) => {
                      const updated = [...checklist];
                      updated[idx].passed = e.target.checked;
                      setChecklist(updated);
                    }}
                    className="accent-[#C8FF35] w-4 h-4 rounded"
                  />
                  <span className={`text-xs ${item.passed ? "text-[#C8FF35] font-semibold" : "text-gray-300"}`}>
                    {item.item}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Inspector Notes</label>
              <textarea
                rows={2}
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                placeholder="Optional QC notes or observations..."
                className="w-full bg-[#0B0B0C] border border-[#242426] rounded p-2 text-xs text-white focus:outline-none focus:border-[#C8FF35]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#242426]">
              <button
                onClick={() => setShowQcModal(false)}
                className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleSaveQc}
                className="bg-[#C8FF35] hover:bg-[#bcf82a] text-black font-bold px-4 py-1.5 rounded text-xs uppercase transition-colors"
              >
                Save & Pass QC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
