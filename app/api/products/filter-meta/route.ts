import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isArchived: false,
        isActive: true,
      },
      select: {
        id: true,
        category: true,
        price: true,
        materials: true,
        stock: true,
        customizable: true,
        collectionId: true,
        collection: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (products.length === 0) {
      return NextResponse.json({
        collections: [],
        categories: [],
        materials: [],
        priceRange: { min: 0, max: 0 },
        inStockCount: 0,
        customizableCount: 0,
        total: 0,
      });
    }

    // Dynamic collections mapping
    const collectionMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
    const categoryMap = new Map<string, number>();
    const materialSet = new Set<string>();

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let inStockCount = 0;
    let customizableCount = 0;

    for (const p of products) {
      if (p.price < minPrice) minPrice = p.price;
      if (p.price > maxPrice) maxPrice = p.price;
      if (p.stock > 0) inStockCount++;
      if (p.customizable) customizableCount++;

      // Category
      if (p.category) {
        categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
      }

      // Collection
      if (p.collection) {
        const existing = collectionMap.get(p.collection.slug);
        if (existing) {
          existing.count++;
        } else {
          collectionMap.set(p.collection.slug, {
            id: p.collection.id,
            name: p.collection.name,
            slug: p.collection.slug,
            count: 1,
          });
        }
      }

      // Materials (split if comma-separated or take whole)
      if (p.materials) {
        const parts = p.materials.split(",").map((s) => s.trim()).filter(Boolean);
        for (const m of parts) {
          if (m.length > 2 && m.length < 40) {
            materialSet.add(m);
          }
        }
      }
    }

    return NextResponse.json({
      collections: Array.from(collectionMap.values()),
      categories: Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count })),
      materials: Array.from(materialSet),
      priceRange: {
        min: Math.floor(minPrice === Infinity ? 0 : minPrice),
        max: Math.ceil(maxPrice === -Infinity ? 0 : maxPrice),
      },
      inStockCount,
      customizableCount,
      total: products.length,
    });
  } catch (error) {
    console.error("GET /api/products/filter-meta error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filter metadata" },
      { status: 500 }
    );
  }
}
