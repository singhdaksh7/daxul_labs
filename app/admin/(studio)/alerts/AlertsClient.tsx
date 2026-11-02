"use client";

import React, { useState } from "react";
import { api, useApi, PageHeader, Card, Stat, Badge, Table, ErrorBox, Loading, btnGhost, fmtDate } from "@/components/admin/ops/ui";

export default function AlertsClient() {
  const { data, loading, error, reload } = useApi<any>("/api/admin/alerts");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const update = async (id: string, status: "ACKNOWLEDGED" | "RESOLVED" | "OPEN") => {
    setBusy(id);
    setActionError(null);
    try {
      await api("/api/admin/alerts", { method: "PATCH", body: JSON.stringify({ id, status }) });
      await reload();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const alerts: any[] = data?.alerts || [];

  return (
    <div className="space-y-8">
      <PageHeader title="Alert Center" subtitle="Live operational scan: low stock, printer maintenance, failures and at-risk orders." onRefresh={reload} />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Open" value={data?.metrics?.totalOpen ?? 0} />
        <Stat label="Critical" value={data?.metrics?.critical ?? 0} tone="bad" />
        <Stat label="Warning" value={data?.metrics?.warning ?? 0} tone="warn" />
      </div>

      <Card title="Active alerts">
        {loading && !data ? (
          <Loading label="Scanning operations..." />
        ) : (
          <Table head={["Severity", "Type", "Alert", "Status", "Raised", "Actions"]} empty="All clear. No open alerts.">
            {alerts.map((a) => (
              <tr key={a.id} className="align-top hover:bg-[#1a1a1d]">
                <td className="py-3 pr-4">
                  <Badge tone={a.severity === "CRITICAL" ? "bad" : a.severity === "WARNING" ? "warn" : "info"}>{a.severity}</Badge>
                </td>
                <td className="py-3 pr-4">{String(a.type).replace(/_/g, " ")}</td>
                <td className="py-3 pr-4">
                  <div className="font-medium text-[#F3F0E9]">{a.title}</div>
                  <div className="mt-0.5 max-w-md text-[11px] text-gray-500">{a.message}</div>
                </td>
                <td className="py-3 pr-4">
                  <Badge tone={a.status === "ACKNOWLEDGED" ? "lime" : "muted"}>{a.status}</Badge>
                </td>
                <td className="py-3 pr-4">{fmtDate(a.createdAt)}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    {a.status === "OPEN" && (
                      <button disabled={busy === a.id} onClick={() => update(a.id, "ACKNOWLEDGED")} className={btnGhost}>
                        Acknowledge
                      </button>
                    )}
                    <button disabled={busy === a.id} onClick={() => update(a.id, "RESOLVED")} className={btnGhost}>
                      Resolve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
