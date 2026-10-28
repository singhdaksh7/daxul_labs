import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  answer: z.string().trim().min(3, "Answer must be at least 3 characters").max(1000),
  authorName: z.string().trim().default("Daxul Studio"),
  isOfficial: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const { id: questionId } = await params;
    const body = await req.json();

    const parseResult = answerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { answer, authorName, isOfficial } = parseResult.data;

    const question = await prisma.productQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Create the answer
    const newAnswer = await prisma.productAnswer.create({
      data: {
        questionId,
        authorName,
        answer,
        isOfficial,
      },
    });

    // If question was PENDING, auto-approve it so the question and its official response are published
    if (question.status === "PENDING") {
      await prisma.productQuestion.update({
        where: { id: questionId },
        data: { status: "APPROVED" },
      });
    }

    return NextResponse.json({
      success: true,
      answer: newAnswer,
    });
  } catch (error) {
    console.error("POST /api/admin/qa/[id]/answer error:", error);
    return NextResponse.json({ error: "Failed to post answer" }, { status: 500 });
  }
}
