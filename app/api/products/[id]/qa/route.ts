import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProductQASummary } from "@/lib/qa";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const submitQuestionSchema = z.object({
  authorName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  authorEmail: z.string().trim().email("Valid email required"),
  question: z.string().trim().min(5, "Question must be at least 5 characters").max(500),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questions = await getProductQASummary(id);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("GET /api/products/[id]/qa error:", error);
    return NextResponse.json({ error: "Failed to load product questions" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json();

    const parseResult = submitQuestionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { authorName, authorEmail, question } = parseResult.data;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Rate limiting: 1 submission per email per product every 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingRecent = await prisma.productQuestion.findFirst({
      where: {
        productId,
        authorEmail: { equals: authorEmail, mode: "insensitive" },
        createdAt: { gte: oneDayAgo },
      },
    });

    if (existingRecent) {
      return NextResponse.json(
        { error: "You have already asked a question for this product recently. Our studio is reviewing it." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id || null;

    const newQuestion = await prisma.productQuestion.create({
      data: {
        productId,
        userId,
        authorName,
        authorEmail,
        question,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your question has been submitted for studio review.",
      questionId: newQuestion.id,
    });
  } catch (error) {
    console.error("POST /api/products/[id]/qa error:", error);
    return NextResponse.json({ error: "Failed to submit question" }, { status: 500 });
  }
}
