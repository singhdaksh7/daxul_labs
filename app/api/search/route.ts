import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizeSearchQuery, computeRelevanceScore } from "@/lib/searchEngine";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q") || "";
    const cleanQuery = sanitizeSearchQuery(rawQuery);

    if (cleanQuery.length < 2) {
      return NextResponse.json({
        products: [],
        collections: [],
        total: 0,
        query: cleanQuery,
      });
    }

    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "10", 10)), 24);

    // Parallel search on live Product DB & Collection DB
    const [products, collections] = await Promise.all([
      prisma.product.findMany({
        where: {
          isArchived: false,
          isActive: true,
          OR: [
            { name: { contains: cleanQuery, mode: "insensitive" } },
            { sku: { contains: cleanQuery, mode: "insensitive" } },
            { category: { contains: cleanQuery, mode: "insensitive" } },
            { materials: { contains: cleanQuery, mode: "insensitive" } },
            { description: { contains: cleanQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          category: true,
          sku: true,
          images: true,
          stock: true,
          badge: true,
          customizable: true,
          materials: true,
          description: true,
        },
        take: 30, // Fetch top candidates to rank in-memory
      }),
      prisma.collection.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: cleanQuery, mode: "insensitive" } },
            { slug: { contains: cleanQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
        take: 5,
      }),
    ]);

    // Rank products by relevance
    const rankedProducts = products
      .map((p) => ({
        ...p,
        image: p.images[0] || "",
        inStock: p.stock > 0,
        relevanceScore: computeRelevanceScore(p, cleanQuery),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .map(({ relevanceScore, ...rest }) => rest);

    // Record Search Query Log asynchronously (never fails request)
    try {
      const sessionId = req.headers.get("x-session-id") || req.cookies.get("daxul_session_id")?.value || null;
      await prisma.searchQueryLog.create({
        data: {
          query: cleanQuery,
          resultsCount: rankedProducts.length,
          sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
        },
      });
    } catch {
      // Non-fatal telemetry log error
    }

    return NextResponse.json({
      products: rankedProducts,
      collections,
      total: rankedProducts.length,
      query: cleanQuery,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again.", products: [], collections: [], total: 0 },
      { status: 500 }
    );
  }
}
