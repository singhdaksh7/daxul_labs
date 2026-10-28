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

    const questions = await prisma.productQuestion.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: true },
        },
        answers: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const pendingCount = await prisma.productQuestion.count({ where: { status: "PENDING" } });
    const approvedCount = await prisma.productQuestion.count({ where: { status: "APPROVED" } });
    const rejectedCount = await prisma.productQuestion.count({ where: { status: "REJECTED" } });

    return NextResponse.json({
      questions,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/qa error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
