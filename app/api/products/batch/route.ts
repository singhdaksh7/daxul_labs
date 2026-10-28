import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawIds = body?.ids;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Limit to max 12 IDs, sanitize to strings
    const cleanIds = rawIds
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .slice(0, 12);

    if (cleanIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Fetch all live products to map cleanly
    const allProducts = await getProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    // Reconstruct in exact requested order
    const orderedProducts = cleanIds
      .map((id) => productMap.get(id))
      .filter(Boolean);

    return NextResponse.json({ products: orderedProducts });
  } catch (error) {
    console.error("POST /api/products/batch error:", error);
    return NextResponse.json({ error: "Failed to hydrate products", products: [] }, { status: 500 });
  }
}
