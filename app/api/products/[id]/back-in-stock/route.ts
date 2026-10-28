import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().optional(),
  variantId: z.string().trim().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = SubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, phone, variantId } = parsed.data;
    const cleanEmail = email.toLowerCase();

    // Verify product exists and check live inventory
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variantGroups: {
          include: { variants: true },
        },
      },
    });

    if (!product || product.isArchived) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Determine if product or chosen variant is actually unavailable
    let isUnavailable = false;
    if (variantId) {
      const allVariants = product.variantGroups.flatMap((g) => g.variants);
      const chosen = allVariants.find((v) => v.id === variantId);
      if (!chosen || (chosen.stock !== null && chosen.stock <= 0) || !chosen.isActive) {
        isUnavailable = true;
      }
    } else {
      if (product.trackInventory && product.stock <= 0) {
        isUnavailable = true;
      }
    }

    if (!isUnavailable) {
      return NextResponse.json(
        { error: "This object is currently available and ready to order." },
        { status: 400 }
      );
    }

    // Deduplicate: Upsert subscription
    await prisma.backInStockSubscription.upsert({
      where: {
        productId_variantId_email: {
          productId,
          variantId: variantId || null as any,
          email: cleanEmail,
        },
      },
      update: {
        status: "PENDING",
        phone: phone || undefined,
      },
      create: {
        productId,
        variantId: variantId || null,
        email: cleanEmail,
        phone: phone || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "You will be notified immediately when this object is back in stock.",
    });
  } catch (error) {
    console.error("POST /api/products/[id]/back-in-stock error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe for stock notification. Please try again." },
      { status: 500 }
    );
  }
}
