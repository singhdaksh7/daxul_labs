import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/shell/ui";
import ReviewModerationClient from "./ReviewModerationClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const check = await requireAdminSession();
  if (!check.authorized) {
    redirect("/admin/login");
  }

  const [reviews, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.productReview.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.productReview.count({ where: { status: "PENDING" } }),
    prisma.productReview.count({ where: { status: "APPROVED" } }),
    prisma.productReview.count({ where: { status: "REJECTED" } }),
  ]);

  const serialized = reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
  }));

  return (
    <>
      <PageHeader
        title="Reviews & Moderation"
        subtitle="Manage authentic customer feedback, verify purchases, and post official studio responses."
      />
      <ReviewModerationClient
        initialReviews={serialized}
        initialCounts={{
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: pendingCount + approvedCount + rejectedCount,
        }}
      />
    </>
  );
}
