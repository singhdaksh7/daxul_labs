import { NextRequest, NextResponse } from "next/server";
import { getProductByIdOrSlug, getRelatedProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProductByIdOrSlug(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found", related: [] }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "4", 10)), 12);

    const related = await getRelatedProducts(
      product.id,
      product.category,
      limit,
      product.collectionId,
      product.relatedProductIds || []
    );

    return NextResponse.json({ related });
  } catch (error) {
    console.error("GET /api/products/[id]/related error:", error);
    return NextResponse.json({ error: "Failed to fetch related products", related: [] }, { status: 500 });
  }
}
