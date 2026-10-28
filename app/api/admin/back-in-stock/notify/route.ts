import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { productId, variantId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    // Verify product is actually back in stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true, trackInventory: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.trackInventory && product.stock <= 0) {
      return NextResponse.json(
        { error: "Product stock is still 0. Restock the item before triggering notifications." },
        { status: 400 }
      );
    }

    // Find pending subscribers
    const pendingSubs = await prisma.backInStockSubscription.findMany({
      where: {
        productId,
        ...(variantId ? { variantId } : {}),
        status: "PENDING",
      },
    });

    if (pendingSubs.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No pending subscribers for this item.",
        notifiedCount: 0,
      });
    }

    const now = new Date();

    // Idempotent batch notification creation & subscription update
    await prisma.$transaction(async (tx) => {
      // Create notification logs
      for (const sub of pendingSubs) {
        await tx.notificationLog.create({
          data: {
            channel: "email",
            recipient: sub.email,
            event: "back_in_stock",
            template: "back_in_stock_available",
            status: "sent",
            metadata: {
              productId,
              productName: product.name,
              variantId: sub.variantId,
            },
          },
        });
      }

      // Mark subscriptions as NOTIFIED
      await tx.backInStockSubscription.updateMany({
        where: {
          id: { in: pendingSubs.map((s) => s.id) },
        },
        data: {
          status: "NOTIFIED",
          notifiedAt: now,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: `Successfully notified ${pendingSubs.length} subscribers.`,
      notifiedCount: pendingSubs.length,
    });
  } catch (error) {
    console.error("POST /api/admin/back-in-stock/notify error:", error);
    return NextResponse.json({ error: "Failed to dispatch notifications" }, { status: 500 });
  }
}
