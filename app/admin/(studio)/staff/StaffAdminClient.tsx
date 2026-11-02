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

  const [form, setForm] = useState({ email: "", name: "", password: "", role: "SUPER_ADMIN" });
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, name: form.name || undefined, password: form.password || undefined, role: form.role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to add staff");
      setNotice(json.created ? `Account created for ${json.user.email}. Share the temporary password privately.` : `${json.user.email} now has ${json.user.role} access.`);
      setForm({ email: "", name: "", password: "", role: "SUPER_ADMIN" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setAdding(false);
    }
  };

  const changeAccess = async (m: Member, role: string) => {
    setSaving(m.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: m.id, role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update access");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setSaving(null);
    }
  };

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
      {notice && <p role="status" className="rounded-lg border border-[#C8FF35]/30 px-3 py-2 text-xs text-[#C8FF35]">{notice}</p>}
      <form onSubmit={addStaff} className="grid gap-3 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-5">
          <h2 className="text-sm font-bold text-[#F3F0E9]">Add partner / staff</h2>
          <p className="text-xs text-[#B9B9B4]">SUPER_ADMIN = full access to everything (finance, staff, settings). ADMIN = admin panel and finance, but cannot manage staff. If the email already has an account it is upgraded; otherwise set a temporary password.</p>
        </div>
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-sm text-[#F3F0E9]" />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-sm text-[#F3F0E9]" />
        <input type="password" minLength={10} placeholder="Temporary password (new accounts)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-sm text-[#F3F0E9]" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-sm text-[#F3F0E9]">
          <option value="SUPER_ADMIN">SUPER_ADMIN (everything)</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button type="submit" disabled={adding} className="rounded-lg bg-[#C8FF35] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0B0B0C] disabled:opacity-50">{adding ? "Adding…" : "Add"}</button>
      </form>
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
                  <td className="p-3">
                    <select
                      value={m.role}
                      disabled={saving === m.id}
                      onChange={(e) => changeAccess(m, e.target.value)}
                      className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1 text-xs text-[#F3F0E9]"
                      aria-label={`Account access for ${m.email}`}
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="CUSTOMER">Revoke admin access</option>
                    </select>
                  </td>
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
