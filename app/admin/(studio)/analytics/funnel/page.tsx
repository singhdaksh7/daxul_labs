import { requireAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFunnelMetrics } from "@/lib/funnelAnalytics";
import { PageHeader } from "@/components/admin/shell/ui";
import Link from "next/link";
import FunnelDashboardClient from "./FunnelDashboardClient";

export const dynamic = "force-dynamic";

export default async function FunnelAnalyticsPage() {
  const check = await requireAdminSession();
  if (!check.authorized) {
    redirect("/admin/login");
  }

  const report = await getFunnelMetrics();

  return (
    <>
      <PageHeader
        title="Conversion Funnel Analytics"
        subtitle="Live telemetry across customer discovery, cart commitment, and checkout completion."
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/analytics"
              className="rounded-full border border-[#242426] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white"
            >
              Overview
            </Link>
            <Link
              href="/admin/analytics/funnel"
              className="rounded-full border border-[#C8FF35] bg-[#C8FF35] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0B0B0C]"
            >
              Funnel
            </Link>
            <Link
              href="/admin/analytics/products"
              className="rounded-full border border-[#242426] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white"
            >
              Products
            </Link>
          </div>
        }
      />
      <div className="px-4 py-6 sm:px-8">
        <FunnelDashboardClient initialReport={report} />
      </div>
    </>
  );
}
