"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const ROLES = ["SUPER_ADMIN", "OPERATIONS", "PRODUCTION", "QC", "PACKING", "SUPPORT", "CONTENT", "ANALYTICS"] as const;

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  staffRole: string | null;
  permissions: string[];
  twoFactorEnabled: boolean;
};

export default function StaffAdminClient() {
  const [staff, setStaff] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load staff");
      setStaff(json.staff || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (m: Member, staffRole: string) => {
    setSaving(m.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: m.id, staffRole, permissions: m.permissions }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update role");
      setStaff((prev) => prev.map((x) => (x.id === m.id ? { ...x, staffRole: json.user.staffRole } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Staff & Permissions</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">Admin users and their operational roles. Only SUPER_ADMIN can change roles.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[#242426] bg-[#151515]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-[#B9B9B4]">
            <tr><th className="p-3">User</th><th className="p-3">Account role</th><th className="p-3">Staff role</th><th className="p-3">2FA</th></tr>
          </thead>
          <tbody className="divide-y divide-[#242426]">
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-xs text-[#B9B9B4]">Loading…</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-xs text-[#B9B9B4]">No staff found.</td></tr>
            ) : (
              staff.map((m) => (
                <tr key={m.id}>
                  <td className="p-3"><p className="font-semibold text-[#F3F0E9]">{m.name || "—"}</p><p className="text-xs text-[#B9B9B4]">{m.email}</p></td>
                  <td className="p-3 text-xs text-[#B9B9B4]">{m.role}</td>
                  <td className="p-3">
                    <select
                      value={m.staffRole ?? ""}
                      disabled={saving === m.id}
                      onChange={(e) => e.target.value && changeRole(m, e.target.value)}
                      className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1 text-xs text-[#F3F0E9]"
                      aria-label={`Staff role for ${m.email}`}
                    >
                      <option value="">Unassigned</option>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-xs">{m.twoFactorEnabled ? <span className="text-[#C8FF35]">On</span> : <span className="text-[#B9B9B4]">Off</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
