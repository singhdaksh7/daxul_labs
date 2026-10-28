import { NextRequest, NextResponse } from "next/server";
import { getProductConversionMetrics } from "@/lib/funnelAnalytics";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const products = await getProductConversionMetrics();
    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET /api/admin/analytics/conversion error:", error);
    return NextResponse.json({ error: "Failed to generate conversion metrics" }, { status: 500 });
  }
}
