"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Collection,
  HomepageSection,
  ThemeSettings,
  SiteSettings,
  Coupon,
  Order,
  ManufacturingStatus,
  OrderItem,
  CustomFieldConfig,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_COLLECTIONS,
  INITIAL_SECTIONS,
  INITIAL_THEME_SETTINGS,
  INITIAL_SITE_SETTINGS,
  INITIAL_COUPONS,
  INITIAL_ORDERS,
} from './initialData';

export interface CartItem {
  id: string; // unique item instance id
  product: Product;
  quantity: number;
  selectedFinish?: string;
  selectedColor?: string;
  selectedSize?: string;
  customizations: Record<string, string>;
  customizationFee: number;
  totalUnitPrice: number;
}

interface StoreContextType {
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  duplicateProduct: (id: string) => void;
  archiveProduct: (id: string) => void;
  deleteProduct: (id: string) => void;

  // Collections
  collections: Collection[];
  addCollection: (col: Omit<Collection, 'id'>) => void;
  updateCollection: (id: string, updated: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;

  // Sections (Site Editor)
  sections: HomepageSection[];
  updateSection: (id: string, updated: Partial<HomepageSection>) => void;
  reorderSections: (newSections: HomepageSection[]) => void;
  toggleSectionVisibility: (id: string) => void;
  duplicateSection: (id: string) => void;

  // Theme Settings
  themeSettings: ThemeSettings;
  updateThemeSettings: (updated: Partial<ThemeSettings>) => void;
  resetThemeToDefault: () => void;

  // Site Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (updated: Partial<SiteSettings>) => void;

  // Coupons
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  updateCoupon: (id: string, updated: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;

  // Orders & Manufacturing Workflow
  orders: Order[];
  addOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status' | 'statusHistory'>) => Order;
  updateOrderStatus: (orderId: string, status: ManufacturingStatus, note?: string) => void;
  updateOrderDetails: (orderId: string, updated: Partial<Order>) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Global Admin Reset
  resetAllToDefault: () => void;
  isAdminMode: boolean;
  setIsAdminMode: (admin: boolean) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'daxul_products_v2',
  COLLECTIONS: 'daxul_collections_v2',
  SECTIONS: 'daxul_sections_v2',
  THEME: 'daxul_theme_v2',
  SITE: 'daxul_site_v2',
  COUPONS: 'daxul_coupons_v2',
  ORDERS: 'daxul_orders_v2',
  CART: 'daxul_cart_v2',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [sections, setSections] = useState<HomepageSection[]>(INITIAL_SECTIONS);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(INITIAL_THEME_SETTINGS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (p) setProducts(JSON.parse(p));

      const c = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      if (c) setCollections(JSON.parse(c));

      const s = localStorage.getItem(STORAGE_KEYS.SECTIONS);
      if (s) setSections(JSON.parse(s));

      const t = localStorage.getItem(STORAGE_KEYS.THEME);
      if (t) setThemeSettings(JSON.parse(t));

      const st = localStorage.getItem(STORAGE_KEYS.SITE);
      if (st) setSiteSettings(JSON.parse(st));

      const cp = localStorage.getItem(STORAGE_KEYS.COUPONS);
      if (cp) setCoupons(JSON.parse(cp));

      const o = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (o) setOrders(JSON.parse(o));

      const crt = localStorage.getItem(STORAGE_KEYS.CART);
      if (crt) setCart(JSON.parse(crt));
    } catch (err) {
      console.error('Error hydrating store state:', err);
    }
    setIsHydrated(true);
  }, []);

  // Save changes to localStorage when updated
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {}
  }, [products, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    } catch (e) {}
  }, [collections, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
    } catch (e) {}
  }, [sections, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(themeSettings));
    } catch (e) {}
  }, [themeSettings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SITE, JSON.stringify(siteSettings));
    } catch (e) {}
  }, [siteSettings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    } catch (e) {}
  }, [coupons, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {}
  }, [orders, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {}
  }, [cart, isHydrated]);

  // Product actions
  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  };

  const duplicateProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    const duplicated: Product = {
      ...target,
      id: `prod-${Date.now()}`,
      name: `${target.name} (Copy)`,
      slug: `${target.slug}-copy`,
    };
    setProducts((prev) => [duplicated, ...prev]);
  };

  const archiveProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isArchived: !p.isArchived } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Collection actions
  const addCollection = (colData: Omit<Collection, 'id'>) => {
    const newCol: Collection = {
      ...colData,
      id: `col-${Date.now()}`,
    };
    setCollections((prev) => [...prev, newCol]);
  };

  const updateCollection = (id: string, updated: Partial<Collection>) => {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  // Section actions
  const updateSection = (id: string, updated: Partial<HomepageSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const reorderSections = (newSections: HomepageSection[]) => {
    const reordered = newSections.map((sec, idx) => ({ ...sec, order: idx + 1 }));
    setSections(reordered);
  };

  const toggleSectionVisibility = (id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s)));
  };

  const duplicateSection = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (!target) return;
    const dup: HomepageSection = {
      ...target,
      id: `sec-${Date.now()}`,
      title: `${target.title} (Copy)`,
      order: target.order + 0.5,
    };
    const updated = [...sections, dup].sort((a, b) => a.order - b.order);
    reorderSections(updated);
  };

  // Theme actions
  const updateThemeSettings = (updated: Partial<ThemeSettings>) => {
    setThemeSettings((prev) => ({ ...prev, ...updated }));
  };

  const resetThemeToDefault = () => {
    setThemeSettings(INITIAL_THEME_SETTINGS);
  };

  // Site Settings actions
  const updateSiteSettings = (updated: Partial<SiteSettings>) => {
    setSiteSettings((prev) => ({ ...prev, ...updated }));
  };

  // Coupons
  const addCoupon = (cData: Omit<Coupon, 'id'>) => {
    const newC: Coupon = { ...cData, id: `c-${Date.now()}` };
    setCoupons((prev) => [...prev, newC]);
  };

  const updateCoupon = (id: string, updated: Partial<Coupon>) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  // Orders
  const addOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status' | 'statusHistory'>) => {
    const uniqueId = `DX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      ...orderData,
      id: uniqueId,
      orderNumber: uniqueId,
      createdAt: new Date().toISOString(),
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          note: 'Order received online',
        },
      ],
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: ManufacturingStatus, note?: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const historyItem = {
            status,
            timestamp: new Date().toISOString(),
            note: note || `Moved to ${siteSettings.orderStatusLabels[status] || status}`,
          };
          return {
            ...o,
            status,
            statusHistory: [...o.statusHistory, historyItem],
          };
        }
        return o;
      })
    );
  };

  const updateOrderDetails = (orderId: string, updated: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
  };

  // Cart actions
  const addToCart = (item: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setCart((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const q = i.quantity + delta;
            return q > 0 ? { ...i, quantity: q } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string) => {
    const codeClean = code.trim().toUpperCase();
    const target = coupons.find((c) => c.code.toUpperCase() === codeClean && c.isActive);
    if (!target) {
      return { success: false, message: 'Invalid or expired promo code.' };
    }
    const subtotal = cart.reduce((acc, item) => acc + item.totalUnitPrice * item.quantity, 0);
    if (subtotal < target.minOrderValue) {
      return {
        success: false,
        message: `Minimum order value of ${siteSettings.currencySymbol}${target.minOrderValue} required for this code.`,
      };
    }
    setAppliedCoupon(target);
    return { success: true, message: `Promo code ${target.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Global Reset
  const resetAllToDefault = () => {
    setProducts(INITIAL_PRODUCTS);
    setCollections(INITIAL_COLLECTIONS);
    setSections(INITIAL_SECTIONS);
    setThemeSettings(INITIAL_THEME_SETTINGS);
    setSiteSettings(INITIAL_SITE_SETTINGS);
    setCoupons(INITIAL_COUPONS);
    setOrders(INITIAL_ORDERS);
    setCart([]);
    setAppliedCoupon(null);
    try {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        duplicateProduct,
        archiveProduct,
        deleteProduct,
        collections,
        addCollection,
        updateCollection,
        deleteCollection,
        sections,
        updateSection,
        reorderSections,
        toggleSectionVisibility,
        duplicateSection,
        themeSettings,
        updateThemeSettings,
        resetThemeToDefault,
        siteSettings,
        updateSiteSettings,
        coupons,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        orders,
        addOrder,
        updateOrderStatus,
        updateOrderDetails,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        isCartOpen,
        setIsCartOpen,
        resetAllToDefault,
        isAdminMode,
        setIsAdminMode,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
