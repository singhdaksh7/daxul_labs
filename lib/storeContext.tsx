"use client";

/**
 * Cart-only client context. Catalog, settings, policies, theme, orders and
 * coupons are NOT held here: they are read from PostgreSQL by server
 * components (lib/catalog.ts). Only the cart lives in localStorage so it
 * survives a refresh. Prices stored on lines are display estimates; the server
 * recomputes everything at checkout.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Collection,
  Coupon,
  HomepageSection,
  ManufacturingStatus,
  Order,
  Product,
  SiteSettings,
  ThemeSettings,
} from './types';

export interface CartVariantSelection {
  groupId: string;
  variantId: string;
  groupName: string;
  variantName: string;
  priceAdjustment: number;
}

export interface CartCustomizationDetail {
  fieldId: string;
  label: string;
  display: string;
}

export interface CartItem {
  id: string; // unique line id
  productId: string;
  slug: string;
  name: string;
  image: string;
  quantity: number;
  basePrice: number;
  variantSelections: CartVariantSelection[];
  /** fieldId -> value (text/date/choice value/uploaded file URL) */
  customizations: Record<string, string>;
  customizationDetails: CartCustomizationDetail[];
  /** Estimated custom-field fees + choice adjustments (per unit). */
  customizationFee: number;
  /** Estimated unit price: base + variant adjustments + customization fee. */
  unitPrice: number;
  prepaidOnly: boolean;
  codEnabled: boolean;
  customizable: boolean;
}

export interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'daxul_cart_v3';
const COUPON_KEY = 'daxul_coupon_v3';

function lineSignature(i: Omit<CartItem, 'id' | 'quantity'>): string {
  const v = [...i.variantSelections].map((s) => `${s.groupId}:${s.variantId}`).sort().join('|');
  const c = Object.keys(i.customizations)
    .sort()
    .map((k) => `${k}=${i.customizations[k]}`)
    .join('|');
  return `${i.productId}#${v}#${c}`;
}

function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is CartItem =>
      !!x &&
      typeof x === 'object' &&
      typeof (x as CartItem).id === 'string' &&
      typeof (x as CartItem).productId === 'string' &&
      typeof (x as CartItem).quantity === 'number' &&
      Array.isArray((x as CartItem).variantSelections),
  );
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCodeState] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(sanitizeCart(JSON.parse(raw)));
      const c = localStorage.getItem(COUPON_KEY);
      if (c) setCouponCodeState(c);
    } catch {
      // ignore corrupt storage
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // storage unavailable
    }
  }, [cart, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (couponCode) localStorage.setItem(COUPON_KEY, couponCode);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      // storage unavailable
    }
  }, [couponCode, isHydrated]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setCart((prev) => {
      const sig = lineSignature(item);
      const existing = prev.find((l) => lineSignature(l) === sig);
      if (existing) {
        return prev.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + item.quantity } : l));
      }
      return [...prev, { ...item, id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateCartQuantity = useCallback((itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: Math.min(99, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCouponCodeState('');
  }, []);

  const setCouponCode = useCallback((code: string) => setCouponCodeState(code.trim().toUpperCase()), []);

  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0), [cart]);

  const value: CartContextType = {
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    couponCode,
    setCouponCode,
    isCartOpen,
    setIsCartOpen,
    isHydrated,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a StoreProvider');
  return ctx;
};

/**
 * @deprecated TYPE-ONLY compatibility shim for the old admin page
 * (app/admin/page.tsx, scheduled for deletion). It describes the removed
 * admin-oriented state so that file still type-checks; at runtime these members
 * do not exist. Customer code must use `useCart()`.
 */
export interface LegacyAdminStore {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  duplicateProduct: (id: string) => void;
  archiveProduct: (id: string) => void;
  deleteProduct: (id: string) => void;
  collections: Collection[];
  addCollection: (col: Omit<Collection, 'id'>) => void;
  updateCollection: (id: string, updated: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  sections: HomepageSection[];
  updateSection: (id: string, updated: Partial<HomepageSection>) => void;
  reorderSections: (newSections: HomepageSection[]) => void;
  toggleSectionVisibility: (id: string) => void;
  duplicateSection: (id: string) => void;
  themeSettings: ThemeSettings;
  updateThemeSettings: (updated: Partial<ThemeSettings>) => void;
  resetThemeToDefault: () => void;
  siteSettings: SiteSettings;
  updateSiteSettings: (updated: Partial<SiteSettings>) => void;
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  updateCoupon: (id: string, updated: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  orders: Order[];
  addOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status' | 'statusHistory'>) => Order;
  updateOrderStatus: (orderId: string, status: ManufacturingStatus, note?: string) => void;
  updateOrderDetails: (orderId: string, updated: Partial<Order>) => void;
  resetAllToDefault: () => void;
  isAdminMode: boolean;
  setIsAdminMode: (admin: boolean) => void;
}

/** @deprecated see LegacyAdminStore. */
export const useStore = (): CartContextType & LegacyAdminStore => useCart() as CartContextType & LegacyAdminStore;
