"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Plus, Clock, FileText, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";

export default function ExpensesAdminClient() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("FILAMENT");
  const [classification, setClassification] = useState("OPERATING_EXPENSE");
  const [paymentSource, setPaymentSource] = useState("PARTNER_PAID");
  const [paidByPartnerId, setPaidByPartnerId] = useState("");
  const [totalAmountRupees, setTotalAmountRupees] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");
  const [recoveryMode, setRecoveryMode] = useState("PARTNER_SPLIT");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, partRes] = await Promise.all([
        fetch("/api/admin/finance/expenses"),
        fetch("/api/admin/finance/partners"),
      ]);
      if (expRes.ok) {
        const d = await expRes.json();
        setExpenses(d.expenses || []);
      }
      if (partRes.ok) {
        const pd = await partRes.json();
        const activeList = pd.partners || [];
        setPartners(activeList);
        if (activeList.length > 0) {
          const primary = activeList.find((p: any) => p.isPrimarySettlementPartner) || activeList[0];
          setPaidByPartnerId(primary.id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          classification,
          isBusinessAccountPaid: paymentSource === "BUSINESS_ACCOUNT",
          recoveryMode,
          paidByPartnerId: paymentSource === "PARTNER_PAID" ? paidByPartnerId : undefined,
          totalAmountRupees: parseFloat(totalAmountRupees),
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create expense");

      setSuccess(`Expense "${d.expense.title}" logged successfully.`);
      setTitle("");
      setDescription("");
      setTotalAmountRupees("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8" id="expenses-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">Business Expense Ledger</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">
          Log operating & capital expenses, assign deterministic 3-way splits, and generate partner ledger debts.
        </p>
      </div>

      {error && (
        <div id="expense-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="expense-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Expenses List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#C8FF35]" />
              Logged Expenses ({expenses.length})
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs text-[#B9B9B4]" id="expenses-table">
                <thead className="border-b border-[#242426] text-[11px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Title / Expense</th>
                    <th className="pb-3 pr-4 font-semibold">Classification</th>
                    <th className="pb-3 pr-4 font-semibold">Paid By</th>
                    <th className="pb-3 pr-4 font-semibold">Total Amount</th>
                    <th className="pb-3 pr-4 font-semibold">Split Details</th>
                    <th className="pb-3 pr-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#1a1a1d] expense-row" data-expense-id={exp.id}>
                      <td className="py-3.5 pr-4 font-medium text-[#F3F0E9]">
                        {exp.title}
                        <span className="block text-[11px] text-gray-500">{exp.category}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                          {exp.classification}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        {!exp.isBusinessAccountPaid && exp.paidByPartner ? (
                          <span className="text-[#C8FF35]">Partner: {exp.paidByPartner?.displayName}</span>
                        ) : (
                          <span className="text-gray-400">Company Account</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-[#F3F0E9]">
                        ₹{(Number(exp.totalAmountPaise) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="space-y-0.5 text-[11px]">
                          {exp.recoveryMode === "REVENUE" && (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full border border-[#C8FF35]/30 bg-[#C8FF35]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#C8FF35]">From revenue</span>
                              <p className="text-gray-400">
                                Recovered {"\u20b9"}{((exp.revenueRecoveries || []).reduce((a: number, r: any) => a + Number(r.amountPaise), 0) / 100).toLocaleString("en-IN")} of {"\u20b9"}{(Number(exp.totalAmountPaise) / 100).toLocaleString("en-IN")}
                              </p>
                            </div>
                          )}
                          {(exp.shares || exp.partnerShares)?.map((s: any) => (
                            <div key={s.id} className="flex justify-between gap-2">
                              <span>{s.partner?.displayName}:</span>
                              <span className="text-gray-300">₹{(Number(s.shareAmountPaise) / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <a
                          href={`/admin/finance/expenses/${exp.id}`}
                          className="text-[11px] text-[#C8FF35] hover:underline"
                        >
                          Timeline & Proof
                        </a>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No expenses logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Expense Form */}
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#C8FF35]" />
            Log New Expense
          </h2>
          <form onSubmit={handleCreateExpense} className="mt-5 space-y-5" id="expense-form">
            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Title</label>
              <input
                id="expense-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. QA Printer Tooling Expense"
                required
                className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Amount (₹ Rupees)</label>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                value={totalAmountRupees}
                onChange={(e) => setTotalAmountRupees(e.target.value)}
                placeholder="30000"
                required
                className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B9B9B4]">Classification</label>
                <select
                  id="expense-classification-select"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                >
                  <option value="OPERATING_EXPENSE">Operating Expense (OPEX)</option>
                  <option value="CAPITAL_EXPENSE">Capital Expense (CAPEX)</option>
                  <option value="INVENTORY_PURCHASE">Inventory Purchase</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B9B9B4]">Category</label>
                <select
                  id="expense-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                >
                  <option value="FILAMENT">Filament</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="THREE_D_PRINTER">3D Printer</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="EQUIPMENT">Equipment & Tooling</option>
                  <option value="MAINTENANCE">Maintenance & Repair</option>
                  <option value="OFFICE">Office & Overhead</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B9B9B4]">Payment Source</label>
                <select
                  id="payment-source-select"
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                >
                  <option value="PARTNER_PAID">Paid by Partner</option>
                  <option value="BUSINESS_ACCOUNT">Paid from Business Account</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B9B9B4]">Split Type</label>
                <select
                  id="split-type-select"
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                >
                  <option value="EQUAL">Equal 3-Way</option>
                  <option value="OWNERSHIP_PROPORTIONAL">Ownership Split</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B9B9B4]">Who bears this cost?</label>
              <select
                id="expense-recovery-select"
                value={recoveryMode}
                onChange={(e) => {
                  setRecoveryMode(e.target.value);
                  if (e.target.value === "REVENUE") setPaymentSource("PARTNER_PAID");
                }}
                className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              >
                <option value="PARTNER_SPLIT">Split between all partners</option>
                <option value="REVENUE">Recover from business revenue (payer is repaid from sales)</option>
              </select>
            </div>

            {paymentSource === "PARTNER_PAID" && (
              <div>
                <label className="block text-[11px] font-medium text-[#B9B9B4]">Paying Partner</label>
                <select
                  id="paid-by-partner-select"
                  value={paidByPartnerId}
                  onChange={(e) => setPaidByPartnerId(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} {p.isPrimarySettlementPartner ? "(Primary Settlement)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              id="submit-expense-btn"
              type="submit"
              className="mt-6 w-full rounded-lg bg-[#C8FF35] py-2.5 text-xs font-semibold text-black hover:bg-[#b8eb28]"
            >
              Log Expense & Distribute Shares
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
