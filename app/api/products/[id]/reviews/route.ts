import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { calculateVerifiedPurchase, getProductReviewSummary } from "@/lib/reviews";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CreateReviewSchema = z.object({
  authorName: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  authorEmail: z.string().trim().email("Please provide a valid email"),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().nullable(),
  comment: z.string().trim().min(5, "Review must be at least 5 characters").max(1000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = await getProductReviewSummary(id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/products/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = CreateReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid review data" },
        { status: 400 }
      );
    }

    const { authorName, authorEmail, rating, title, comment } = parsed.data;
    const cleanEmail = authorEmail.toLowerCase();

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Rate-limit: Check if an identical review was submitted recently (last 24 hours)
    const recentReview = await prisma.productReview.findFirst({
      where: {
        productId,
        authorEmail: { equals: cleanEmail, mode: "insensitive" },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentReview) {
      return NextResponse.json(
        { error: "You have already submitted a review for this object recently." },
        { status: 429 }
      );
    }

    // Authenticated session check if available
    const session = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id || null;

    // Server-authoritative calculation of verified purchase
    const { isVerified, orderId } = await calculateVerifiedPurchase(
      productId,
      cleanEmail,
      sessionUserId
    );

    // Create review with PENDING status by default (moderation gate)
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId: sessionUserId,
        orderId: orderId || null,
        authorName,
        authorEmail: cleanEmail,
        rating,
        title: title || null,
        comment,
        isVerifiedPurchase: isVerified,
        status: "PENDING", // Never trusted from client
      },
      select: {
        id: true,
        status: true,
        isVerifiedPurchase: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Review submitted successfully and is pending studio moderation.",
      reviewId: review.id,
      status: review.status,
      isVerifiedPurchase: review.isVerifiedPurchase,
    });
  } catch (error) {
    console.error("POST /api/products/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "Failed to submit review. Please try again." },
      { status: 500 }
    );
  }
}
