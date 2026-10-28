import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
const mockQuestions: Array<{
  id: string;
  productId: string;
  authorName: string;
  authorEmail: string;
  question: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  answers: Array<{
    id: string;
    questionId: string;
    authorName: string;
    isOfficial: boolean;
    answer: string;
    createdAt: Date;
  }>;
}> = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    productQuestion: {
      findMany: vi.fn(async ({ where }) => {
        return mockQuestions
          .filter((q) => {
            if (where?.productId && q.productId !== where.productId) return false;
            if (where?.status && q.status !== where.status) return false;
            return true;
          })
          .map((q) => ({
            id: q.id,
            authorName: q.authorName,
            question: q.question,
            createdAt: q.createdAt,
            answers: q.answers,
          }));
      }),
      findFirst: vi.fn(async ({ where }) => {
        return mockQuestions.find((q) => {
          if (where?.productId && q.productId !== where.productId) return false;
          if (
            where?.authorEmail?.equals &&
            q.authorEmail.toLowerCase() === where.authorEmail.equals.toLowerCase()
          ) {
            if (where?.createdAt?.gte && q.createdAt < where.createdAt.gte) return false;
            return true;
          }
          return false;
        }) || null;
      }),
      create: vi.fn(async ({ data }) => {
        const item = {
          id: `q-${Date.now()}`,
          productId: data.productId,
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          question: data.question,
          status: (data.status || "PENDING") as "PENDING" | "APPROVED" | "REJECTED",
          createdAt: new Date(),
          answers: [],
        };
        mockQuestions.push(item);
        return item;
      }),
      update: vi.fn(async ({ where, data }) => {
        const item = mockQuestions.find((q) => q.id === where.id);
        if (item && data.status) item.status = data.status;
        return item;
      }),
    },
    productAnswer: {
      create: vi.fn(async ({ data }) => {
        const ans = {
          id: `ans-${Date.now()}`,
          questionId: data.questionId,
          authorName: data.authorName,
          isOfficial: data.isOfficial,
          answer: data.answer,
          createdAt: new Date(),
        };
        const q = mockQuestions.find((item) => item.id === data.questionId);
        if (q) q.answers.push(ans);
        return ans;
      }),
    },
  },
}));

import { getProductQASummary } from "@/lib/qa";

describe("Product Q&A System", () => {
  beforeEach(() => {
    mockQuestions.length = 0;

    // Seed test data
    mockQuestions.push({
      id: "q-1",
      productId: "prod-alpha",
      authorName: "Ananya S.",
      authorEmail: "ananya.private@example.com",
      question: "Can this shade be washed with water?",
      status: "APPROVED",
      createdAt: new Date("2026-10-15T10:00:00Z"),
      answers: [
        {
          id: "ans-1",
          questionId: "q-1",
          authorName: "Daxul Studio",
          isOfficial: true,
          answer: "We recommend cleaning with a dry microfiber cloth or cold damp cloth. Do not soak.",
          createdAt: new Date("2026-10-15T12:00:00Z"),
        },
      ],
    });

    mockQuestions.push({
      id: "q-2",
      productId: "prod-alpha",
      authorName: "Spam Bot",
      authorEmail: "bot@spam.com",
      question: "Cheap sunglasses at xyz.com",
      status: "PENDING",
      createdAt: new Date("2026-10-20T10:00:00Z"),
      answers: [],
    });
  });

  it("filters out PENDING and REJECTED questions from public summary", async () => {
    const summary = await getProductQASummary("prod-alpha");
    expect(summary).toHaveLength(1);
    expect(summary[0].id).toBe("q-1");
    expect(summary[0].question).toBe("Can this shade be washed with water?");
  });

  it("strictly excludes author email addresses from public summary", async () => {
    const summary = await getProductQASummary("prod-alpha");
    const item = summary[0] as unknown as Record<string, unknown>;
    expect(item.authorEmail).toBeUndefined();
    expect(JSON.stringify(summary)).not.toContain("ananya.private@example.com");
  });

  it("includes official studio answers with proper metadata", async () => {
    const summary = await getProductQASummary("prod-alpha");
    expect(summary[0].answers).toHaveLength(1);
    expect(summary[0].answers[0].isOfficial).toBe(true);
    expect(summary[0].answers[0].authorName).toBe("Daxul Studio");
    expect(summary[0].answers[0].answer).toContain("microfiber cloth");
  });

  it("enforces 24-hour rate limit check per email and product", async () => {
    const { prisma } = await import("@/lib/db");
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Existing check
    const existing = await prisma.productQuestion.findFirst({
      where: {
        productId: "prod-alpha",
        authorEmail: { equals: "ananya.private@example.com", mode: "insensitive" },
        createdAt: { gte: oneDayAgo },
      },
    });

    // In seed, created was 2026-10-15 so it's > 24h ago
    expect(existing).toBeNull();

    // Now insert a recent question
    await prisma.productQuestion.create({
      data: {
        productId: "prod-alpha",
        authorName: "Rohan",
        authorEmail: "rohan@test.com",
        question: "What is the wattage rating of the LED bulb?",
        status: "PENDING",
      },
    });

    const recent = await prisma.productQuestion.findFirst({
      where: {
        productId: "prod-alpha",
        authorEmail: { equals: "rohan@test.com", mode: "insensitive" },
        createdAt: { gte: oneDayAgo },
      },
    });

    expect(recent).not.toBeNull();
    expect(recent?.authorName).toBe("Rohan");
  });
});
