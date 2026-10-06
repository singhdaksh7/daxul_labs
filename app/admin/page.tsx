"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import {
  Product,
  Collection,
  HomepageSection,
  ManufacturingStatus,
  CustomFieldConfig,
  CustomFieldType,
  BusinessCosts,
} from "@/lib/types";
import {
  calculateUnitCost,
  calculateProfit,
  calculateMargin,
} from "@/lib/initialData";
import {
  LayoutDashboard,
  Package,
  Layers,
  Sliders,
  Palette,
  Settings,
  Tag,
  ShoppingBag,
  Eye,
  Plus,
  Trash2,
  Copy,
  Edit,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle,
  Clock,
  Printer,
  ShieldAlert,
  Search,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  FileText,
  MessageSquare,
  Upload,
} from "lucide-react";

export default function AdminDashboardPage() {
  const {
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
    updateOrderStatus,
    updateOrderDetails,
    resetAllToDefault,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "orders"
    | "products"
    | "collections"
    | "site_editor"
    | "theme"
    | "store_settings"
    | "coupons"
  >("overview");

  // Filter & Search states inside admin tabs
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStageFilter, setOrderStageFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");

  // Product Editing Modal / Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // New Custom Field Temp state when editing product custom fields
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldFee, setNewFieldFee] = useState(0);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  // Collections editing state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingCol, setEditingCol] = useState<Partial<Collection> | null>(null);

  // Business metrics calculation
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const ordersToday = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const countByStage = (stage: ManufacturingStatus) =>
    orders.filter((o) => o.status === stage).length;

  const lowStockProducts = products.filter((p) => p.stock <= 15);

  // Filtered orders for workflow tab
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase());
    const matchStage = orderStageFilter === "all" || o.status === orderStageFilter;
    return matchSearch && matchStage;
  });

  // Handle open product editor
  const handleOpenProductEditor = (prod?: Product) => {
    if (prod) {
      setEditingProductId(prod.id);
      setEditingProduct({ ...prod });
    } else {
      setEditingProductId("new");
      setEditingProduct({
        name: "New 3D Object",
        slug: `new-object-${Date.now()}`,
        category: "Shadow Objects",
        price: 1999,
        compareAtPrice: 2499,
        description: "High-precision 3D printed lighting object.",
        story: "Designed in our studio using algorithmic geometry.",
        specs: [
          { label: "Dimensions", value: "150mm x 150mm x 200mm" },
          { label: "Material", value: "Matte Charcoal Bio-PETG" },
        ],
        careInstructions: ["Clean with dry microfiber cloth."],
        faq: [{ question: "Is it dimmable?", answer: "Yes, compatible with touch dimmers." }],
        images: [
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop",
        ],
        badge: "New Drop",
        stock: 25,
        productionTimeDays: 2,
        estimatedDispatchDays: 3,
        prepaidOnly: false,
        codEnabled: true,
        finishes: ["Matte Charcoal", "Bone White"],
        colors: ["Warm Gold LED (2700K)"],
        sizes: ["Standard (200mm)"],
        customFields: [],
        businessCosts: {
          filamentGrams: 250,
          printHours: 14,
          filamentCostPerGram: 1.5,
          hardwareCost: 250,
          packagingCost: 90,
          otherMaterialCost: 40,
        },
      });
    }
  };

  const handleSaveProduct = () => {
    if (!editingProduct || !editingProduct.name) return;
    if (editingProductId === "new") {
      addProduct(editingProduct as any);
    } else if (editingProductId) {
      updateProduct(editingProductId, editingProduct);
    }
    setEditingProductId(null);
    setEditingProduct(null);
  };

  // Add custom field to current editing product
  const handleAddCustomFieldToProduct = () => {
    if (!editingProduct || !newFieldLabel) return;
    const newFieldConfig: CustomFieldConfig = {
      id: `field-${Date.now()}`,
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired,
      fee: Number(newFieldFee),
      placeholder: newFieldPlaceholder,
      options: newFieldOptions ? newFieldOptions.split(",").map((s) => s.trim()) : undefined,
    };
    const currentFields = editingProduct.customFields || [];
    setEditingProduct({
      ...editingProduct,
      customFields: [...currentFields, newFieldConfig],
    });
    setNewFieldLabel("");
    setNewFieldPlaceholder("");
    setNewFieldOptions("");
    setNewFieldFee(0);
  };

  const handleRemoveCustomFieldFromProduct = (fieldId: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      customFields: (editingProduct.customFields || []).filter((f) => f.id !== fieldId),
    });
  };

  // Move section up / down
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    reorderSections(copy);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex flex-col font-sans selection:bg-[#C8FF35] selection:text-[#0B0B0C]">
      
      {/* Top Admin Header Bar */}
      <header className="bg-[#151515] border-b border-[#242426] sticky top-0 z-40 px-4 sm:px-8 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-[0.2em] text-white">
              DAX<span className="text-[#C8FF35]">U</span>L
            </span>
            <span className="bg-[#C8FF35] text-[#0B0B0C] text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
              STUDIO OS ADMIN
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetAllToDefault}
            className="flex items-center gap-1.5 bg-[#242426] hover:bg-amber-500 hover:text-black text-gray-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to DAXUL Default</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 bg-[#C8FF35] text-[#0B0B0C] px-4 py-1.5 rounded-full text-xs font-extrabold uppercase hover:bg-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>View Live Store</span>
          </Link>
        </div>
      </header>

      {/* Main Admin Body Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Left Admin Sidebar Navigation */}
        <aside className="w-full lg:w-64 bg-[#151515]/60 border-r border-[#242426] p-4 shrink-0 space-y-1">
          <div className="text-[10px] font-mono text-gray-500 uppercase px-3 pb-2 font-bold">
            ADMIN MANAGEMENT PANELS
          </div>

          {[
            { id: "overview", label: "Overview & Analytics", icon: LayoutDashboard },
            { id: "orders", label: "Orders & Manufacturing", icon: Printer, badge: countByStage("new") },
            { id: "products", label: "Products & Custom Fields", icon: Package },
            { id: "collections", label: "Collections", icon: Layers },
            { id: "site_editor", label: "Site Editor & Layout", icon: Sliders },
            { id: "theme", label: "Theme & Brand Style", icon: Palette },
            { id: "store_settings", label: "Store Info & Policies", icon: Settings },
            { id: "coupons", label: "Promo Coupons", icon: Tag },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-[#C8FF35] text-[#0B0B0C] shadow-lg shadow-[#C8FF35]/15"
                    : "text-gray-400 hover:text-white hover:bg-[#242426]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className="bg-[#0B0B0C] text-[#C8FF35] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl overflow-x-hidden">
          
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold uppercase">Executive Studio Dashboard</h1>
                  <p className="text-xs text-gray-400">Live operational metrics, production queue, and gross unit economics.</p>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] p-5 rounded-2xl space-y-2 transition-all">
                  <div className="flex justify-between text-xs text-gray-400 font-bold uppercase">
                    <span>Total Store Revenue</span>
                    <DollarSign className="w-4 h-4 text-[#C8FF35]" />
                  </div>
                  <div className="text-3xl font-black text-white">
                    {siteSettings.currencySymbol}{totalRevenue}
                  </div>
                  <div className="text-[10px] text-green-400 font-mono">↑ Live from store orders</div>
                </div>

                <div className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] p-5 rounded-2xl space-y-2 transition-all">
                  <div className="flex justify-between text-xs text-gray-400 font-bold uppercase">
                    <span>New Orders Today</span>
                    <ShoppingBag className="w-4 h-4 text-[#C8FF35]" />
                  </div>
                  <div className="text-3xl font-black text-white">{ordersToday}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{orders.length} Total Lifetime Orders</div>
                </div>

                <div className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] p-5 rounded-2xl space-y-2 transition-all">
                  <div className="flex justify-between text-xs text-gray-400 font-bold uppercase">
                    <span>Active In Printing</span>
                    <Printer className="w-4 h-4 text-[#C8FF35]" />
                  </div>
                  <div className="text-3xl font-black text-white">{countByStage("printing")}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{countByStage("design_pending")} Pending Custom Approval</div>
                </div>

                <div className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] p-5 rounded-2xl space-y-2 transition-all">
                  <div className="flex justify-between text-xs text-gray-400 font-bold uppercase">
                    <span>Catalog Products</span>
                    <Package className="w-4 h-4 text-[#C8FF35]" />
                  </div>
                  <div className="text-3xl font-black text-white">{products.length}</div>
                  <div className="text-[10px] text-amber-300 font-mono">{lowStockProducts.length} Low-Stock Warnings</div>
                </div>
              </div>

              {/* Manufacturing Workflow Counter Bar */}
              <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C8FF35]" />
                  <span>Manufacturing Workflow Queue Counter</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-9 gap-3 text-center">
                  {[
                    { stage: "new", label: "New Order" },
                    { stage: "design_pending", label: "Design Pend." },
                    { stage: "design_approved", label: "Approved" },
                    { stage: "printing", label: "3D Printing" },
                    { stage: "finishing", label: "Finishing" },
                    { stage: "qc", label: "QC Checked" },
                    { stage: "packed", label: "Packed" },
                    { stage: "shipped", label: "Shipped" },
                    { stage: "delivered", label: "Delivered" },
                  ].map((s) => (
                    <div key={s.stage} className="bg-[#0B0B0C] p-3 rounded-xl border border-[#242426] space-y-1">
                      <div className="text-2xl font-extrabold text-[#C8FF35]">{countByStage(s.stage as any)}</div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase truncate">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Alerts & Best Sellers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Low Stock Alert */}
                <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Low Filament / Object Stock Alerts</span>
                  </h3>

                  {lowStockProducts.length === 0 ? (
                    <p className="text-xs text-gray-400">All object stocks are healthy.</p>
                  ) : (
                    <div className="space-y-2">
                      {lowStockProducts.map((p) => (
                        <div key={p.id} className="flex justify-between items-center bg-[#0B0B0C] p-3 rounded-xl text-xs">
                          <div>
                            <div className="font-bold text-white uppercase">{p.name}</div>
                            <div className="text-gray-400 text-[10px]">{p.category}</div>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                            {p.stock} Units Left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Best Selling Products */}
                <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#C8FF35]" />
                    <span>Best-Selling Objects & Gross Margins</span>
                  </h3>

                  <div className="space-y-2">
                    {products.slice(0, 4).map((p) => {
                      const uCost = calculateUnitCost(p.businessCosts);
                      const margin = calculateMargin(p.price, p.businessCosts);

                      return (
                        <div key={p.id} className="flex justify-between items-center bg-[#0B0B0C] p-3 rounded-xl text-xs">
                          <div>
                            <div className="font-bold text-white uppercase">{p.name}</div>
                            <div className="text-gray-400 text-[10px]">
                              Unit Cost: {siteSettings.currencySymbol}{uCost} • Price: {siteSettings.currencySymbol}{p.price}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-[#C8FF35]">
                            {margin}% Margin
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ORDERS & MANUFACTURING WORKFLOW */}
          {activeTab === "orders" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold uppercase">Orders & Manufacturing Workflow</h1>
                  <p className="text-xs text-gray-400">Move orders through 9 stages: New → Design Pending → Printing → QC → Delivered.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer Name, Email..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full bg-[#151515] border border-[#242426] focus:border-[#C8FF35] rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase focus:outline-none"
                  />
                </div>

                <select
                  value={orderStageFilter}
                  onChange={(e) => setOrderStageFilter(e.target.value)}
                  className="bg-[#151515] border border-[#242426] text-white text-xs font-semibold uppercase px-4 py-2 rounded-xl focus:outline-none"
                >
                  <option value="all">All Stages ({orders.length})</option>
                  <option value="new">New Orders</option>
                  <option value="design_pending">Design Pending</option>
                  <option value="design_approved">Design Approved</option>
                  <option value="printing">3D Printing</option>
                  <option value="finishing">Finishing</option>
                  <option value="qc">QC Checked</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              {/* Orders List */}
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 bg-[#151515] rounded-2xl border border-[#242426] text-gray-400 text-xs uppercase font-bold">
                    No orders match your filter criteria.
                  </div>
                ) : (
                  filteredOrders.map((ord) => (
                    <div key={ord.id} className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4 shadow-xl">
                      
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#242426] pb-3 gap-2">
                        <div>
                          <span className="text-base font-extrabold text-white">Order #{ord.orderNumber}</span>
                          <div className="text-xs text-gray-400">{ord.customerName} ({ord.customerEmail} • {ord.customerPhone})</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-[#C8FF35]">
                            {siteSettings.currencySymbol}{ord.totalAmount} ({ord.paymentMethod.toUpperCase()})
                          </span>

                          {/* Stage Dropdown */}
                          <select
                            value={ord.status}
                            onChange={(e) => updateOrderStatus(ord.id, e.target.value as ManufacturingStatus)}
                            className="bg-[#0B0B0C] border border-[#C8FF35] text-[#C8FF35] font-extrabold text-xs uppercase px-3 py-1.5 rounded-xl focus:outline-none"
                          >
                            <option value="new">1. New Order</option>
                            <option value="design_pending">2. Design Pending</option>
                            <option value="design_approved">3. Design Approved</option>
                            <option value="printing">4. 3D Printing</option>
                            <option value="finishing">5. Hand Finishing</option>
                            <option value="qc">6. QC Checked</option>
                            <option value="packed">7. Packed</option>
                            <option value="shipped">8. Shipped</option>
                            <option value="delivered">9. Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Items & Custom Details */}
                      <div className="space-y-2">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="bg-[#0B0B0C] p-3 rounded-xl border border-[#242426] flex gap-3 text-xs">
                            <img src={it.productImage} alt={it.productName} className="w-12 h-12 object-cover rounded bg-[#151515]" />
                            <div className="flex-1">
                              <div className="font-bold text-white uppercase">{it.productName} (x{it.quantity})</div>
                              <div className="text-gray-400">Finish: {it.selectedFinish} • Color: {it.selectedColor}</div>
                              {Object.keys(it.customizations).length > 0 && (
                                <div className="mt-1 bg-[#151515] p-2 rounded text-[10px] text-[#C8FF35]">
                                  {Object.entries(it.customizations).map(([k, v]) => (
                                    <div key={k}><strong>{k}:</strong> {v}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* QC Note & Tracking edit */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        <input
                          type="text"
                          placeholder="QC Technician Note..."
                          defaultValue={ord.qcNotes || ""}
                          onBlur={(e) => updateOrderDetails(ord.id, { qcNotes: e.target.value })}
                          className="bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white focus:outline-none focus:border-[#C8FF35]"
                        />

                        <input
                          type="text"
                          placeholder="Tracking # (e.g. BD-88902144IN)..."
                          defaultValue={ord.trackingNumber || ""}
                          onBlur={(e) => updateOrderDetails(ord.id, { trackingNumber: e.target.value })}
                          className="bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white focus:outline-none focus:border-[#C8FF35]"
                        />
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTS & CUSTOM FIELDS BUILDER */}
          {activeTab === "products" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold uppercase">Product Catalog & Custom Field Builder</h1>
                  <p className="text-xs text-gray-400">Add products, configure unit costs, auto-calculate gross margins, and build per-product custom forms.</p>
                </div>

                <button
                  onClick={() => handleOpenProductEditor()}
                  className="bg-[#C8FF35] text-[#0B0B0C] px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase flex items-center gap-1.5 hover:bg-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New 3D Object</span>
                </button>
              </div>

              {/* Products Table */}
              <div className="bg-[#151515] border border-[#242426] rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[#242426]">
                  <input
                    type="text"
                    placeholder="Filter catalog by product name or category..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B0B0C] text-gray-400 uppercase font-mono border-b border-[#242426]">
                      <tr>
                        <th className="p-4">Object</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Est. Unit Cost</th>
                        <th className="p-4">Gross Margin</th>
                        <th className="p-4">Custom Fields</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242426]">
                      {products
                        .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((p) => {
                          const unitCost = calculateUnitCost(p.businessCosts);
                          const margin = calculateMargin(p.price, p.businessCosts);

                          return (
                            <tr key={p.id} className="hover:bg-[#1C1C1E] transition-colors">
                              <td className="p-4 font-bold text-white flex items-center gap-3">
                                <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded bg-[#0B0B0C]" />
                                <div>
                                  <div>{p.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">{p.slug}</div>
                                </div>
                              </td>
                              <td className="p-4 text-gray-300">{p.category}</td>
                              <td className="p-4 font-extrabold text-white">{siteSettings.currencySymbol}{p.price}</td>
                              <td className="p-4 font-mono text-gray-300">{siteSettings.currencySymbol}{unitCost}</td>
                              <td className="p-4 font-mono font-bold text-[#C8FF35]">{margin}%</td>
                              <td className="p-4 text-gray-400">{p.customFields.length} configured</td>
                              <td className="p-4 flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenProductEditor(p)}
                                  className="p-1.5 bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] rounded-lg transition-colors"
                                  title="Edit Product & Custom Fields"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => duplicateProduct(p.id)}
                                  className="p-1.5 bg-[#242426] hover:bg-white hover:text-[#0B0B0C] rounded-lg transition-colors"
                                  title="Duplicate Product"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteProduct(p.id)}
                                  className="p-1.5 bg-[#242426] hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRODUCT & CUSTOM FIELD EDITOR MODAL */}
              {editingProduct && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-[#151515] border border-[#242426] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center border-b border-[#242426] pb-4">
                      <h2 className="text-lg font-extrabold uppercase text-[#C8FF35]">
                        {editingProductId === "new" ? "Add New Object" : `Edit Object: ${editingProduct.name}`}
                      </h2>
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        ✕ Close
                      </button>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-300 uppercase">Product Name</label>
                        <input
                          type="text"
                          value={editingProduct.name || ""}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-300 uppercase">Category</label>
                        <input
                          type="text"
                          value={editingProduct.category || ""}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                          className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-300 uppercase">Selling Price ({siteSettings.currencySymbol})</label>
                        <input
                          type="number"
                          value={editingProduct.price || 0}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                          className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-300 uppercase">Stock Quantity</label>
                        <input
                          type="number"
                          value={editingProduct.stock || 0}
                          onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                          className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-gray-300 uppercase">Image URL (Comma separated)</label>
                        <input
                          type="text"
                          value={(editingProduct.images || []).join(", ")}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              images: e.target.value.split(",").map((s) => s.trim()),
                            })
                          }
                          className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                        />
                      </div>
                    </div>

                    {/* INTERNAL BUSINESS COSTS & AUTO CALCULATIONS */}
                    <div className="bg-[#0B0B0C] border border-[#242426] p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center border-b border-[#242426] pb-2">
                        <span className="text-xs font-bold text-[#C8FF35] uppercase flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          <span>Internal Manufacturing Costs & Unit Economics</span>
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">Auto Gross Margin Calculator</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-gray-400 block mb-1">Filament Grams</label>
                          <input
                            type="number"
                            value={editingProduct.businessCosts?.filamentGrams || 0}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                businessCosts: {
                                  ...editingProduct.businessCosts!,
                                  filamentGrams: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                        </div>

                        <div>
                          <label className="text-gray-400 block mb-1">Filament ₹/Gram</label>
                          <input
                            type="number"
                            step="0.1"
                            value={editingProduct.businessCosts?.filamentCostPerGram || 1.5}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                businessCosts: {
                                  ...editingProduct.businessCosts!,
                                  filamentCostPerGram: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                        </div>

                        <div>
                          <label className="text-gray-400 block mb-1">Hardware Cost ({siteSettings.currencySymbol})</label>
                          <input
                            type="number"
                            value={editingProduct.businessCosts?.hardwareCost || 0}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                businessCosts: {
                                  ...editingProduct.businessCosts!,
                                  hardwareCost: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                        </div>

                        <div>
                          <label className="text-gray-400 block mb-1">Packaging Cost ({siteSettings.currencySymbol})</label>
                          <input
                            type="number"
                            value={editingProduct.businessCosts?.packagingCost || 0}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                businessCosts: {
                                  ...editingProduct.businessCosts!,
                                  packagingCost: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                        </div>

                        <div>
                          <label className="text-gray-400 block mb-1">Other Material Cost ({siteSettings.currencySymbol})</label>
                          <input
                            type="number"
                            value={editingProduct.businessCosts?.otherMaterialCost || 0}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                businessCosts: {
                                  ...editingProduct.businessCosts!,
                                  otherMaterialCost: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      {/* Auto Calculated Summary */}
                      {editingProduct.businessCosts && (
                        <div className="bg-[#151515] p-3 rounded-xl flex justify-between items-center text-xs font-mono border border-[#242426]">
                          <div>
                            Unit Cost: <strong className="text-white">{siteSettings.currencySymbol}{calculateUnitCost(editingProduct.businessCosts)}</strong>
                          </div>
                          <div>
                            Est. Profit: <strong className="text-white">{siteSettings.currencySymbol}{calculateProfit(editingProduct.price || 0, editingProduct.businessCosts)}</strong>
                          </div>
                          <div>
                            Gross Margin: <strong className="text-[#C8FF35]">{calculateMargin(editingProduct.price || 0, editingProduct.businessCosts)}%</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CUSTOMIZATION FORM BUILDER FOR THIS PRODUCT */}
                    <div className="bg-[#0B0B0C] border border-[#C8FF35]/30 p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center border-b border-[#242426] pb-2">
                        <span className="text-xs font-bold text-[#C8FF35] uppercase flex items-center gap-1.5">
                          <Sliders className="w-4 h-4" />
                          <span>Product Customization Form Builder</span>
                        </span>
                        <span className="text-[10px] text-gray-400">Configure photo upload, custom names, dates per product</span>
                      </div>

                      {/* Active Custom Fields List */}
                      <div className="space-y-2">
                        {(editingProduct.customFields || []).length === 0 ? (
                          <div className="text-xs text-gray-500 italic">No custom fields added yet. Add your first field below!</div>
                        ) : (
                          (editingProduct.customFields || []).map((f) => (
                            <div key={f.id} className="flex justify-between items-center bg-[#151515] p-3 rounded-xl border border-[#242426] text-xs">
                              <div>
                                <span className="font-bold text-white">{f.label}</span>
                                <span className="text-gray-500 ml-2 font-mono">[{f.type}]</span>
                                {f.required && <span className="text-red-400 ml-2 font-bold">*Required</span>}
                                {f.fee > 0 && <span className="text-[#C8FF35] ml-2 font-mono">+{siteSettings.currencySymbol}{f.fee} Fee</span>}
                              </div>
                              <button
                                onClick={() => handleRemoveCustomFieldFromProduct(f.id)}
                                className="text-gray-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Form Builder Input controls */}
                      <div className="border-t border-[#242426] pt-3 space-y-3">
                        <div className="text-xs font-bold text-white uppercase">Add New Custom Field:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <input
                            type="text"
                            placeholder="Field Label (e.g. Photo Upload, Name 1)"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            className="bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as any)}
                            className="bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          >
                            <option value="text">Text Input</option>
                            <option value="textarea">Textarea Message</option>
                            <option value="photo">Photo Upload</option>
                            <option value="date">Date Picker</option>
                            <option value="select">Dropdown Select</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Custom Fee (e.g. 150)"
                            value={newFieldFee}
                            onChange={(e) => setNewFieldFee(Number(e.target.value))}
                            className="bg-[#151515] border border-[#242426] p-2 rounded-lg text-white"
                          />
                        </div>

                        {newFieldType === "select" && (
                          <input
                            type="text"
                            placeholder="Select Options (Comma separated: Black, Gold, White)"
                            value={newFieldOptions}
                            onChange={(e) => setNewFieldOptions(e.target.value)}
                            className="w-full bg-[#151515] border border-[#242426] p-2 rounded-lg text-xs text-white"
                          />
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newFieldRequired}
                              onChange={(e) => setNewFieldRequired(e.target.checked)}
                              className="accent-[#C8FF35]"
                            />
                            <span>Make this field required</span>
                          </label>

                          <button
                            type="button"
                            onClick={handleAddCustomFieldToProduct}
                            className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all"
                          >
                            + Add Field
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-[#242426] pt-4">
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="bg-[#242426] text-gray-300 px-5 py-2.5 rounded-xl text-xs font-bold uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProduct}
                        className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-2.5 rounded-xl text-xs font-extrabold uppercase hover:bg-white"
                      >
                        Save Product & Custom Fields
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COLLECTIONS MANAGER */}
          {activeTab === "collections" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-extrabold uppercase">Collections Manager</h1>
                  <p className="text-xs text-gray-400">Create & edit store collections, banner images, and featured tags.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((c) => (
                  <div key={c.id} className="bg-[#151515] border border-[#242426] p-5 rounded-2xl space-y-3">
                    <img src={c.image} alt={c.name} className="w-full h-36 object-cover rounded-xl bg-[#0B0B0C]" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white uppercase text-base">{c.name}</h3>
                        <div className="text-xs text-gray-400 font-mono">{c.slug}</div>
                      </div>
                      <button
                        onClick={() => deleteCollection(c.id)}
                        className="text-gray-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VISUAL SITE EDITOR & SECTION REORDERING */}
          {activeTab === "site_editor" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-extrabold uppercase">Site Editor & Homepage Section Manager</h1>
                <p className="text-xs text-gray-400">Reorder sections up/down, hide/show sections, duplicate, or edit titles and button labels for every single section.</p>
              </div>

              <div className="space-y-4">
                {sections
                  .sort((a, b) => a.order - b.order)
                  .map((sec, idx) => (
                    <div
                      key={sec.id}
                      className={`bg-[#151515] border p-5 rounded-2xl space-y-4 transition-all ${
                        sec.isVisible ? "border-[#242426]" : "border-red-500/30 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#242426] pb-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-[#0B0B0C] border border-[#242426] text-[#C8FF35] font-mono text-xs font-bold px-2.5 py-1 rounded">
                            Section {idx + 1}
                          </span>
                          <span className="font-bold text-white uppercase text-sm">{sec.title}</span>
                          <span className="text-[10px] font-mono text-gray-500 uppercase">[{sec.type}]</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMoveSection(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] rounded-lg disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveSection(idx, "down")}
                            disabled={idx === sections.length - 1}
                            className="p-1.5 bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] rounded-lg disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => toggleSectionVisibility(sec.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                              sec.isVisible ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {sec.isVisible ? "Visible" : "Hidden"}
                          </button>

                          <button
                            onClick={() => duplicateSection(sec.id)}
                            className="p-1.5 bg-[#242426] hover:bg-white hover:text-black rounded-lg"
                            title="Duplicate Section"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content Edit Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-gray-400 font-bold uppercase">Section Title</label>
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                            className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-400 font-bold uppercase">Badge Text</label>
                          <input
                            type="text"
                            value={sec.badgeText}
                            onChange={(e) => updateSection(sec.id, { badgeText: e.target.value })}
                            className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-gray-400 font-bold uppercase">Main Paragraph Content</label>
                          <textarea
                            rows={2}
                            value={sec.content}
                            onChange={(e) => updateSection(sec.id, { content: e.target.value })}
                            className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-400 font-bold uppercase">Primary Button Label</label>
                          <input
                            type="text"
                            value={sec.ctaText}
                            onChange={(e) => updateSection(sec.id, { ctaText: e.target.value })}
                            className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-400 font-bold uppercase">Media Image URL</label>
                          <input
                            type="text"
                            value={sec.mediaUrl}
                            onChange={(e) => updateSection(sec.id, { mediaUrl: e.target.value })}
                            className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                          />
                        </div>
                      </div>

                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 6: THEME SETTINGS AREA */}
          {activeTab === "theme" && (
            <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-extrabold uppercase">Theme & Visual Settings</h1>
                  <p className="text-xs text-gray-400">Control accent colors, background styling, font families, and card styles live across the website.</p>
                </div>

                <button
                  onClick={resetThemeToDefault}
                  className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  Reset Theme Defaults
                </button>
              </div>

              <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-bold text-gray-300 uppercase block">Accent Color (Hex)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeSettings.accentColor}
                      onChange={(e) => updateThemeSettings({ accentColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={themeSettings.accentColor}
                      onChange={(e) => updateThemeSettings({ accentColor: e.target.value })}
                      className="bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-gray-300 uppercase block">Background Color</label>
                  <input
                    type="text"
                    value={themeSettings.backgroundColor}
                    onChange={(e) => updateThemeSettings({ backgroundColor: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-gray-300 uppercase block">Border Radius Style</label>
                  <select
                    value={themeSettings.borderRadius}
                    onChange={(e) => updateThemeSettings({ borderRadius: e.target.value as any })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white uppercase"
                  >
                    <option value="none">Sharp Corners (0px)</option>
                    <option value="sm">Small Radius (4px)</option>
                    <option value="md">Modern Radius (12px)</option>
                    <option value="lg">Full Rounded (24px)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: STORE INFO, MICROCOPY & POLICIES */}
          {activeTab === "store_settings" && (
            <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
              <div>
                <h1 className="text-2xl font-extrabold uppercase">Store Information & Policy Microcopy</h1>
                <p className="text-xs text-gray-400">Edit announcement text, WhatsApp number, shipping fees, free shipping threshold, and legal policy pages.</p>
              </div>

              <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4 text-xs">
                <h3 className="font-bold text-[#C8FF35] uppercase text-sm border-b border-[#242426] pb-2">Announcement Bar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Banner Announcement Text</label>
                    <input
                      type="text"
                      value={siteSettings.announcementBarText}
                      onChange={(e) => updateSiteSettings({ announcementBarText: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                </div>

                <h3 className="font-bold text-[#C8FF35] uppercase text-sm border-b border-[#242426] pb-2 pt-4">Contact & WhatsApp</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">WhatsApp Number</label>
                    <input
                      type="text"
                      value={siteSettings.whatsAppNumber}
                      onChange={(e) => updateSiteSettings({ whatsAppNumber: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Contact Email</label>
                    <input
                      type="text"
                      value={siteSettings.contactEmail}
                      onChange={(e) => updateSiteSettings({ contactEmail: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Currency Symbol</label>
                    <input
                      type="text"
                      value={siteSettings.currencySymbol}
                      onChange={(e) => updateSiteSettings({ currencySymbol: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                </div>

                <h3 className="font-bold text-[#C8FF35] uppercase text-sm border-b border-[#242426] pb-2 pt-4">Shipping & COD Rules</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Standard Shipping Fee</label>
                    <input
                      type="number"
                      value={siteSettings.standardShippingFee}
                      onChange={(e) => updateSiteSettings({ standardShippingFee: Number(e.target.value) })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Free Shipping Threshold</label>
                    <input
                      type="number"
                      value={siteSettings.freeShippingThreshold}
                      onChange={(e) => updateSiteSettings({ freeShippingThreshold: Number(e.target.value) })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold text-[#C8FF35]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">COD Handling Fee</label>
                    <input
                      type="number"
                      value={siteSettings.codFee}
                      onChange={(e) => updateSiteSettings({ codFee: Number(e.target.value) })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                </div>

                <h3 className="font-bold text-[#C8FF35] uppercase text-sm border-b border-[#242426] pb-2 pt-4">Policy Texts</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Shipping Policy</label>
                    <textarea
                      rows={3}
                      value={siteSettings.shippingPolicyText}
                      onChange={(e) => updateSiteSettings({ shippingPolicyText: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Return & Replacement Policy</label>
                    <textarea
                      rows={3}
                      value={siteSettings.returnPolicyText}
                      onChange={(e) => updateSiteSettings({ returnPolicyText: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: PROMO COUPONS */}
          {activeTab === "coupons" && (
            <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
              <div>
                <h1 className="text-2xl font-extrabold uppercase">Promo Coupons Manager</h1>
                <p className="text-xs text-gray-400">Create discount promo codes for cart checkout.</p>
              </div>

              <div className="space-y-3">
                {coupons.map((c) => (
                  <div key={c.id} className="bg-[#151515] border border-[#242426] p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-[#C8FF35] text-sm uppercase">{c.code}</div>
                      <div className="text-gray-400">
                        {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `${siteSettings.currencySymbol}${c.discountValue} OFF`} • Min Order: {siteSettings.currencySymbol}{c.minOrderValue}
                      </div>
                    </div>
                    <button onClick={() => deleteCoupon(c.id)} className="text-gray-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
