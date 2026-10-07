-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "collectionId" TEXT,
ADD COLUMN     "customizable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadTimeText" TEXT,
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "materials" TEXT,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "trackInventory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CustomField" ADD COLUMN     "choices" JSONB,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "heroMedia" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productSku" TEXT,
ADD COLUMN     "variantSelections" JSONB;

-- AlterTable
ALTER TABLE "OrderStatusHistory" ADD COLUMN     "adminEmail" TEXT;

-- AlterTable
ALTER TABLE "ThemeSettings" ADD COLUMN     "boneColor" TEXT NOT NULL DEFAULT '#F3F0E9',
ADD COLUMN     "buttonRadius" TEXT NOT NULL DEFAULT 'md',
ADD COLUMN     "carbonColor" TEXT NOT NULL DEFAULT '#0B0B0C',
ADD COLUMN     "graphiteColor" TEXT NOT NULL DEFAULT '#242426';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "codFeeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "customProductsPrepaidOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultOgImage" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "instagramHandle" TEXT NOT NULL DEFAULT 'daxullabs',
ADD COLUMN     "orderPrefix" TEXT NOT NULL DEFAULT 'DXL',
ADD COLUMN     "searchIndexingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supportHours" TEXT,
ADD COLUMN     "whatsAppUrl" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "ProductVariantGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "delta" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "adminUserId" TEXT,
    "adminEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePolicy" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePolicy_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "InventoryAdjustment_productId_createdAt_idx" ON "InventoryAdjustment"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantGroup" ADD CONSTRAINT "ProductVariantGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductVariantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

