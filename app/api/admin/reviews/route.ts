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
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "ALL";
    const productId = searchParams.get("productId");

    const where: Record<string, unknown> = {};
    if (statusParam !== "ALL") {
      where.status = statusParam;
    }
    if (productId) {
      where.productId = productId;
    }

    const reviews = await prisma.productReview.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const pendingCount = await prisma.productReview.count({ where: { status: "PENDING" } });
    const approvedCount = await prisma.productReview.count({ where: { status: "APPROVED" } });
    const rejectedCount = await prisma.productReview.count({ where: { status: "REJECTED" } });

    return NextResponse.json({
      reviews,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
