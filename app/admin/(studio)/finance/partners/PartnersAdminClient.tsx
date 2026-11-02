"use client";

import React, { useEffect, useState } from "react";
import { Users, Plus, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function PartnersAdminClient() {
  const [partners, setPartners] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ownershipPercentage, setOwnershipPercentage] = useState("33.333333");
  const [expenseSplitPercentage, setExpenseSplitPercentage] = useState("33.333333");
  const [profitSplitPercentage, setProfitSplitPercentage] = useState("33.333333");
  const [isPrimarySettlementPartner, setIsPrimarySettlementPartner] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/partners");
      if (res.ok) {
        const json = await res.json();
        setPartners(json.partners || []);
        setAvailableUsers(json.availableUsers || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/finance/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          displayName,
          ownershipPercentage: parseFloat(ownershipPercentage),
          expenseSplitPercentage: parseFloat(expenseSplitPercentage),
          profitSplitPercentage: parseFloat(profitSplitPercentage),
          isPrimarySettlementPartner,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to configure partner");
      }

      setSuccess(`Partner ${data.partner.displayName} configured successfully.`);
      fetchPartners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8" id="partners-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Business Partners Configuration</h1>
        <p className="mt-1 text-xs text-[#B9B9B4]">
          Configure active business partners, equity ownership, expense splits, and designated primary collection partner.
        </p>
      </div>

      {error && (
        <div id="partner-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="partner-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Active Partners List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#C8FF35]" />
              Active Partner Roster ({partners.length})
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B9B9B4]" id="partners-table">
                <thead className="border-b border-[#242426] text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-3">Partner Name</th>
                    <th className="pb-3">Ownership %</th>
                    <th className="pb-3">Expense Split %</th>
                    <th className="pb-3">Profit Split %</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1a1a1d] partner-row" data-partner-id={p.id}>
                      <td className="py-3 font-medium text-[#F3F0E9]">
                        {p.displayName}
                        {p.user?.email && <span className="block text-[11px] text-gray-500">{p.user.email}</span>}
                      </td>
                      <td className="py-3">{p.ownershipPercentage}%</td>
                      <td className="py-3">{p.expenseSplitPercentage}%</td>
                      <td className="py-3">{p.profitSplitPercentage}%</td>
                      <td className="py-3">
                        {p.isPrimarySettlementPartner ? (
                          <span className="inline-flex items-center rounded-full bg-[#C8FF35]/10 px-2 py-0.5 text-[10px] font-medium text-[#C8FF35]">
                            Primary Settlement
                          </span>
                        ) : (
                          <span className="text-gray-500">Partner</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                  {partners.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No partners configured yet. Use the form to link an authenticated user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Configure Partner Form */}
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#C8FF35]" />
            Configure Partner
          </h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4" id="partner-form">
            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">User ID / Email Reference</label>
              <input
                id="user-id-input"
                type="text"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="Pick or type the partner's login email"
                list="partner-user-options"
                autoComplete="off"
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <datalist id="partner-user-options">
              {availableUsers.map((u) => (
                <option key={u.id} value={u.email}>{u.name || u.email}</option>
              ))}
            </datalist>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Display Name</label>
              <input
                id="display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. QA Daksh"
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Ownership %</label>
                <input
                  id="ownership-input"
                  type="number"
                  step="0.000001"
                  value={ownershipPercentage}
                  onChange={(e) => setOwnershipPercentage(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Expense %</label>
                <input
                  id="expense-split-input"
                  type="number"
                  step="0.000001"
                  value={expenseSplitPercentage}
                  onChange={(e) => setExpenseSplitPercentage(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Profit %</label>
                <input
                  id="profit-split-input"
                  type="number"
                  step="0.000001"
                  value={profitSplitPercentage}
                  onChange={(e) => setProfitSplitPercentage(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="primary-settlement-checkbox"
                type="checkbox"
                checked={isPrimarySettlementPartner}
                onChange={(e) => setIsPrimarySettlementPartner(e.target.checked)}
                className="h-4 w-4 rounded border-[#242426] bg-[#0B0B0C] text-[#C8FF35] focus:ring-0"
              />
              <label htmlFor="primary-settlement-checkbox" className="text-xs text-[#F3F0E9]">
                Designate as Primary Settlement Partner
              </label>
            </div>

            <button
              id="submit-partner-btn"
              type="submit"
              className="mt-4 w-full rounded-lg bg-[#C8FF35] py-2 text-xs font-semibold text-black hover:bg-[#b8eb28]"
            >
              Save Partner Configuration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

