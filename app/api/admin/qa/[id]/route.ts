import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.productQuestion.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("PATCH /api/admin/qa/[id] error:", error);
    return NextResponse.json({ error: "Failed to update question status" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: check.reason }, { status: check.reason === "Unauthenticated" ? 401 : 403 });
  }

  try {
    const { id } = await params;
    await prisma.productQuestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/qa/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
