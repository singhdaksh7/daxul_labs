import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/shell/ui";
import QAClient from "./QAClient";

export const dynamic = "force-dynamic";

export default async function AdminQAPage() {
  const check = await requireAdminSession();
  if (!check.authorized) {
    redirect("/admin/login");
  }

  const [questions, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.productQuestion.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
        answers: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.productQuestion.count({ where: { status: "PENDING" } }),
    prisma.productQuestion.count({ where: { status: "APPROVED" } }),
    prisma.productQuestion.count({ where: { status: "REJECTED" } }),
  ]);

  const serialized = questions.map((q) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    answers: q.answers.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    status: q.status as "PENDING" | "APPROVED" | "REJECTED",
  }));

  return (
    <>
      <PageHeader
        title="Product Inquiries & Q&A"
        subtitle="Review customer technical questions, moderate submissions, and publish official studio answers."
      />
      <QAClient
        initialQuestions={serialized}
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
