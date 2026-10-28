import { requireAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProductConversionMetrics } from "@/lib/funnelAnalytics";
import { PageHeader } from "@/components/admin/shell/ui";
import Link from "next/link";
import ProductConversionClient from "./ProductConversionClient";

export const dynamic = "force-dynamic";

export default async function ProductAnalyticsPage() {
  const check = await requireAdminSession();
  if (!check.authorized) {
    redirect("/admin/login");
  }

  const products = await getProductConversionMetrics();

  return (
    <>
      <PageHeader
        title="Product Conversion Analytics"
        subtitle="Individual product traffic, cart adds, checkouts, real paid orders, and conversion percentages."
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
              className="rounded-full border border-[#242426] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white"
            >
              Funnel
            </Link>
            <Link
              href="/admin/analytics/products"
              className="rounded-full border border-[#C8FF35] bg-[#C8FF35] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0B0B0C]"
            >
              Products
            </Link>
          </div>
        }
      />
      <div className="px-4 py-6 sm:px-8">
        <ProductConversionClient initialProducts={products} />
      </div>
    </>
  );
}
