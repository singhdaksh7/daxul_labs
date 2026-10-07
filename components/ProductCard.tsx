"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, Sliders } from "lucide-react";
import { useCart } from "@/lib/storeContext";
import { useSiteSettings } from "@/lib/siteContext";
import { formatMoney } from "@/lib/cartPricing";
import type { StoreProduct } from "@/lib/types";

export default function ProductCard({ product }: { product: StoreProduct }) {
  const { addToCart } = useCart();
  const settings = useSiteSettings();
  const image = product.images[0];

  // Products that need choices or personalisation are configured on their page.
  const isSimple = product.variantGroups.length === 0 && product.customFields.length === 0;

  const quickAdd = () =>
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: image || "",
      quantity: 1,
      basePrice: product.price,
      variantSelections: [],
      customizations: {},
      customizationDetails: [],
      customizationFee: 0,
      unitPrice: product.price,
      prepaidOnly: product.prepaidOnly,
      codEnabled: product.codEnabled,
      customizable: product.customizable,
    });

  return (
    <div className="bg-daxul-dark border border-daxul-graphite hover:border-daxul-lime rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg">
      {/* Image */}
      <Link href={`/shop/${product.slug}`} className="relative aspect-square bg-daxul-black overflow-hidden block">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-daxul-gray">
            No image
          </div>
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-daxul-black/80 backdrop-blur text-daxul-lime text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-daxul-graphite">
            {product.badge}
          </span>
        )}
        <span className="absolute bottom-3 right-3 bg-daxul-black/90 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-daxul-graphite">
          {product.productionTimeDays}d Print Time
        </span>
      </Link>

      {/* Info */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-daxul-gray block mb-1">
            {product.category}
          </span>
          <Link
            href={`/shop/${product.slug}`}
            className="text-base font-bold text-white group-hover:text-daxul-lime transition-colors line-clamp-1 block"
          >
            {product.name}
          </Link>
          <p className="text-xs text-gray-400 line-clamp-2 mt-1">{product.subtitle || product.description}</p>
        </div>

        <div className="pt-3 border-t border-daxul-graphite flex items-center justify-between">
          <div>
            <span className="text-base font-black text-white">{formatMoney(settings.currencySymbol, product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-gray-500 line-through ml-2">
                {formatMoney(settings.currencySymbol, product.compareAtPrice)}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {!product.inStock && (
              <span className="text-[10px] font-mono uppercase text-amber-300">Sold out</span>
            )}
            <Link
              href={`/shop/${product.slug}`}
              className="bg-daxul-graphite hover:bg-daxul-lime hover:text-daxul-black text-white p-2 rounded-xl transition-all"
              title="Configure options"
              aria-label={`Configure ${product.name}`}
            >
              <Sliders className="w-4 h-4" />
            </Link>
            {isSimple && product.inStock && (
              <button
                onClick={quickAdd}
                className="bg-daxul-lime text-daxul-black hover:bg-white p-2 rounded-xl transition-all font-bold"
                title="Add to Cart"
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingBag className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
