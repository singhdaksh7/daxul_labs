import { prisma } from "@/lib/db";

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerifiedPurchase: boolean;
  adminResponse: string | null;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  reviews: PublicReview[];
}

/**
 * Server-authoritative Verified Purchase calculation.
 * Requires:
 * - Customer email or authenticated userId matches order ownership
 * - Order is paid (paymentStatus: 'paid')
 * - Order fulfillment is in an eligible fulfilled state (preferably delivered, or shipped/packed)
 * - Order contains the exact productId
 * Never trusts customer input.
 */
export async function calculateVerifiedPurchase(
  productId: string,
  customerEmail: string,
  userId?: string | null
): Promise<{ isVerified: boolean; orderId?: string }> {
  try {
    const cleanEmail = customerEmail.trim().toLowerCase();

    // Look for eligible paid orders containing this product
    const eligibleOrder = await prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { customerEmail: { equals: cleanEmail, mode: "insensitive" } },
              ...(userId ? [{ userId }] : []),
            ],
          },
          { paymentStatus: "paid" },
          {
            status: {
              in: ["delivered", "shipped", "packed"],
            },
          },
          {
            items: {
              some: {
                productId,
              },
            },
          },
        ],
      },
      select: { id: true, status: true },
    });

    if (eligibleOrder) {
      return { isVerified: true, orderId: eligibleOrder.id };
    }

    return { isVerified: false };
  } catch (error) {
    console.error("calculateVerifiedPurchase error:", error);
    return { isVerified: false };
  }
}

/**
 * Fetches review summary & public reviews (APPROVED only).
 * Strictly omits customer emails from the response.
 */
export async function getProductReviewSummary(productId: string): Promise<ReviewSummary> {
  const reviews = await prisma.productReview.findMany({
    where: {
      productId,
      status: "APPROVED",
    },
    select: {
      id: true,
      authorName: true,
      rating: true,
      title: true,
      comment: true,
      isVerifiedPurchase: true,
      adminResponse: true,
      helpfulCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalReviews = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    sum += star;
  }

  const averageRating = totalReviews > 0 ? Math.round((sum / totalReviews) * 10) / 10 : 5.0;

  return {
    averageRating,
    totalReviews,
    distribution,
    reviews: reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
