import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProductByIdOrSlug } from "@/lib/catalog";
import { quoteCustomizations, variantAdjustment } from "@/lib/cartPricing";
import type { CartItem, CartVariantSelection } from "@/lib/storeContext";
import { mergeCartConfigs, type StoredCartLineConfig } from "@/lib/savedCart";

export const dynamic = "force-dynamic";

/**
 * Server-side cart rehydration engine:
 * Reloads product, variant, current prices, and stock from live DB.
 * Never trusts client or persisted price or stock.
 */
async function rehydrateLineConfigs(
  configs: StoredCartLineConfig[]
): Promise<CartItem[]> {
  const items: CartItem[] = [];

  for (const conf of configs) {
    if (!conf?.productId) continue;

    const product = await getProductByIdOrSlug(conf.productId);
    // Exclude deleted or archived products
    if (!product || product.isArchived) continue;

    const variantSelectionsMap: Record<string, string> = {};
    const selectedVariantObjects: CartVariantSelection[] = [];

    // Reload variant from live DB
    for (const sel of conf.variantSelections || []) {
      const group = product.variantGroups.find((g) => g.id === sel.groupId);
      if (group) {
        const variant = group.variants.find((v) => v.id === sel.variantId);
        if (variant) {
          variantSelectionsMap[group.id] = variant.id;
          selectedVariantObjects.push({
            groupId: group.id,
            variantId: variant.id,
            groupName: group.name,
            variantName: variant.name,
            priceAdjustment: variant.priceAdjustment,
          });
        }
      }
    }

    // Revalidate and quote custom fields from live DB
    const customizations = conf.customizations || {};
    const quote = quoteCustomizations(product.customFields, customizations);
    const varAdj = variantAdjustment(product, variantSelectionsMap);
    const liveUnitPrice = product.price + varAdj + quote.fee;

    // Check live stock
    const anyVariantOut = product.variantGroups.some((g) => {
      const v = g.variants.find((x) => x.id === variantSelectionsMap[g.id]);
      return v ? !v.inStock : false;
    });
    const inStock = product.inStock && !anyVariantOut;

    items.push({
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || "",
      quantity: Math.max(1, conf.quantity || 1),
      basePrice: product.price,
      variantSelections: selectedVariantObjects,
      customizations,
      customizationDetails: quote.details,
      customizationFee: quote.fee,
      unitPrice: liveUnitPrice,
      prepaidOnly: product.prepaidOnly,
      codEnabled: product.codEnabled,
      customizable: product.customizable,
    });
  }

  return items;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const guestCart: StoredCartLineConfig[] = Array.isArray(body?.localCart) ? body.localCart : [];
    const guestSaved: StoredCartLineConfig[] = Array.isArray(body?.localSavedForLater) ? body.localSavedForLater : [];

    // Fetch existing user saved cart from DB
    const existingRow = await prisma.userSavedCart.findUnique({
      where: { userId },
    });

    const dbCart: StoredCartLineConfig[] = Array.isArray(existingRow?.cartItems) ? (existingRow.cartItems as unknown as StoredCartLineConfig[]) : [];
    const dbSaved: StoredCartLineConfig[] = Array.isArray(existingRow?.savedForLater) ? (existingRow.savedForLater as unknown as StoredCartLineConfig[]) : [];

    // Merge guest local cart with DB cart without duplicates
    const mergedCartConfigs = mergeCartConfigs(dbCart, guestCart);
    const mergedSavedConfigs = mergeCartConfigs(dbSaved, guestSaved);

    // Save minimal configs back to DB
    await prisma.userSavedCart.upsert({
      where: { userId },
      update: {
        cartItems: mergedCartConfigs as any,
        savedForLater: mergedSavedConfigs as any,
      },
      create: {
        userId,
        cartItems: mergedCartConfigs as any,
        savedForLater: mergedSavedConfigs as any,
      },
    });

    // Rehydrate everything server-side using live DB
    const [hydratedCart, hydratedSaved] = await Promise.all([
      rehydrateLineConfigs(mergedCartConfigs),
      rehydrateLineConfigs(mergedSavedConfigs),
    ]);

    return NextResponse.json({
      cart: hydratedCart,
      savedForLater: hydratedSaved,
    });
  } catch (error) {
    console.error("POST /api/cart/sync error:", error);
    return NextResponse.json({ error: "Failed to sync saved cart" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await prisma.userSavedCart.findUnique({
      where: { userId },
    });

    if (!row) {
      return NextResponse.json({ cart: [], savedForLater: [] });
    }

    const cartConfigs = Array.isArray(row.cartItems) ? (row.cartItems as unknown as StoredCartLineConfig[]) : [];
    const savedConfigs = Array.isArray(row.savedForLater) ? (row.savedForLater as unknown as StoredCartLineConfig[]) : [];

    const [hydratedCart, hydratedSaved] = await Promise.all([
      rehydrateLineConfigs(cartConfigs),
      rehydrateLineConfigs(savedConfigs),
    ]);

    return NextResponse.json({
      cart: hydratedCart,
      savedForLater: hydratedSaved,
    });
  } catch (error) {
    console.error("GET /api/cart/sync error:", error);
    return NextResponse.json({ error: "Failed to load saved cart" }, { status: 500 });
  }
}
