import { NextRequest, NextResponse } from "next/server";
import { getFunnelMetrics } from "@/lib/funnelAnalytics";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const report = await getFunnelMetrics();
    return NextResponse.json({ report });
  } catch (error) {
    console.error("GET /api/admin/analytics/funnel error:", error);
    return NextResponse.json({ error: "Failed to generate funnel report" }, { status: 500 });
  }
}
