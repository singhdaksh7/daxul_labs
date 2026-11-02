"use client";

import React, { useEffect, useState } from "react";
import { Settings, Save, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function RetentionSettingsClient() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/retention");
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
      }
    } catch (err) {
      console.error("Failed to load retention settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/settings/retention", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings");
      setStatusMsg({ type: "success", text: "Retention settings saved successfully." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-12 text-center text-xs text-gray-500">Loading retention settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Retention & Loyalty Configuration</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Safely control feature flags, redemption ratios, referral awards, and notification channels.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[#C8FF35] px-4 py-2 text-xs font-bold text-black hover:bg-[#b8eb2d] disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Retention Settings"}
        </button>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
            statusMsg.type === "success"
              ? "bg-[#C8FF35]/10 text-[#C8FF35] border border-[#C8FF35]/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Feature Flags Section */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Feature Flags (Safety Controls)</h2>
        <p className="mt-0.5 text-xs text-[#B9B9B4]">Default state is OFF for public safety until readiness is confirmed.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: "loyaltyEnabled", label: "Loyalty & Points Program" },
            { key: "referralsEnabled", label: "Peer Referral Program" },
            { key: "giftCardsEnabled", label: "Digital Gift Cards" },
            { key: "storeCreditEnabled", label: "Store Credit Engine" },
            { key: "whatsappEnabled", label: "WhatsApp Notification Layer" },
            { key: "winbackEnabled", label: "Win-Back Inactive Campaign" },
          ].map((flag) => (
            <label
              key={flag.key}
              className="flex items-center justify-between rounded-lg border border-[#242426] bg-[#0B0B0C] p-4 cursor-pointer hover:border-[#C8FF35]/40"
            >
              <span className="text-xs font-medium text-[#F3F0E9]">{flag.label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[flag.key])}
                onChange={(e) => setSettings({ ...settings, [flag.key]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-700 bg-black text-[#C8FF35] focus:ring-[#C8FF35]"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Loyalty Policy Config */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Loyalty & Points Rules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Points per ₹100 Spend
            </label>
            <input
              type="number"
              min="1"
              value={settings.pointsPer100Rupees}
              onChange={(e) => setSettings({ ...settings, pointsPer100Rupees: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Redemption Value (₹ / Point)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.redemptionValuePerPoint}
              onChange={(e) => setSettings({ ...settings, redemptionValuePerPoint: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Min Redemption Points
            </label>
            <input
              type="number"
              value={settings.minimumRedemptionPoints}
              onChange={(e) => setSettings({ ...settings, minimumRedemptionPoints: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Max Order Redemption (% of Subtotal)
            </label>
            <input
              type="number"
              value={settings.maxOrderRedemptionPercent}
              onChange={(e) => setSettings({ ...settings, maxOrderRedemptionPercent: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Points Expiry (Days, 0 = never)
            </label>
            <input
              type="number"
              value={settings.pointExpiryDays}
              onChange={(e) => setSettings({ ...settings, pointExpiryDays: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Pending Days (Post-Delivery Delay)
            </label>
            <input
              type="number"
              value={settings.loyaltyPendingDays}
              onChange={(e) => setSettings({ ...settings, loyaltyPendingDays: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
        </div>
      </div>

      {/* Referral Program Config */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Referral Program Rules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Referrer Reward Type
            </label>
            <select
              value={settings.referralRewardType}
              onChange={(e) => setSettings({ ...settings, referralRewardType: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            >
              <option value="points">Loyalty Points</option>
              <option value="credit">Store Credit (₹)</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Referrer Reward Value
            </label>
            <input
              type="number"
              value={settings.referralRewardAmount}
              onChange={(e) => setSettings({ ...settings, referralRewardAmount: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Min Qualifying Order Spend (₹)
            </label>
            <input
              type="number"
              value={settings.referralMinOrderSpend}
              onChange={(e) => setSettings({ ...settings, referralMinOrderSpend: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9]"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

