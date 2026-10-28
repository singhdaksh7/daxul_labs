import { prisma } from "@/lib/db";

export interface PublicAnswer {
  id: string;
  authorName: string;
  isOfficial: boolean;
  answer: string;
  createdAt: string;
}

export interface PublicQuestion {
  id: string;
  authorName: string;
  question: string;
  answers: PublicAnswer[];
  createdAt: string;
}

/**
 * Fetches public approved questions and their answers.
 * Strictly omits customer emails from the response.
 */
export async function getProductQASummary(productId: string): Promise<PublicQuestion[]> {
  const rows = await prisma.productQuestion.findMany({
    where: {
      productId,
      status: "APPROVED",
    },
    select: {
      id: true,
      authorName: true,
      question: true,
      createdAt: true,
      answers: {
        select: {
          id: true,
          authorName: true,
          isOfficial: true,
          answer: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    question: r.question,
    createdAt: r.createdAt.toISOString(),
    answers: r.answers.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  }));
}
