import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const subscriptions = await prisma.backInStockSubscription.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            stock: true,
            trackInventory: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingCount = subscriptions.filter((s) => s.status === "PENDING").length;
    const notifiedCount = subscriptions.filter((s) => s.status === "NOTIFIED").length;

    // Group by product
    const groupedMap = new Map<string, { product: any; pendingSubscribers: number; totalSubscribers: number }>();
    for (const sub of subscriptions) {
      const pid = sub.productId;
      const existing = groupedMap.get(pid);
      if (existing) {
        existing.totalSubscribers++;
        if (sub.status === "PENDING") existing.pendingSubscribers++;
      } else {
        groupedMap.set(pid, {
          product: sub.product,
          pendingSubscribers: sub.status === "PENDING" ? 1 : 0,
          totalSubscribers: 1,
        });
      }
    }

    return NextResponse.json({
      subscriptions,
      grouped: Array.from(groupedMap.values()),
      counts: {
        pending: pendingCount,
        notified: notifiedCount,
        total: subscriptions.length,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/back-in-stock error:", error);
    return NextResponse.json({ error: "Failed to fetch back-in-stock subscriptions" }, { status: 500 });
  }
}
