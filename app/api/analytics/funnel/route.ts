import { NextRequest, NextResponse } from "next/server";
import { funnelEventInputSchema, recordFunnelEvent } from "@/lib/funnelAnalytics";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = funnelEventInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid funnel event payload", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const serverUserId = (session?.user as { id?: string } | undefined)?.id || null;

    const result = await recordFunnelEvent(parseResult.data, serverUserId);

    return NextResponse.json({
      success: true,
      recorded: result.recorded,
      reason: result.reason,
    });
  } catch (error) {
    console.error("POST /api/analytics/funnel error:", error);
    return NextResponse.json({ error: "Failed to record funnel telemetry" }, { status: 500 });
  }
}
