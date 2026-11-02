-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('FILAMENT', 'ELECTRONICS', 'LED', 'MAGNET', 'FASTENER', 'ADHESIVE', 'PACKAGING', 'PRINTED_INSERT', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('GRAM', 'KG', 'METER', 'PIECE', 'ROLL', 'PACK', 'BOX');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "staffRole" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "Printer" ADD COLUMN     "buildVolumeX" DOUBLE PRECISION NOT NULL DEFAULT 256,
ADD COLUMN     "buildVolumeY" DOUBLE PRECISION NOT NULL DEFAULT 256,
ADD COLUMN     "buildVolumeZ" DOUBLE PRECISION NOT NULL DEFAULT 256,
ADD COLUMN     "expectedUsefulHours" DOUBLE PRECISION DEFAULT 5000,
ADD COLUMN     "lastMaintenanceAt" TIMESTAMP(3),
ADD COLUMN     "manufacturer" TEXT DEFAULT 'Bambu Lab',
ADD COLUMN     "nextMaintenanceAt" TIMESTAMP(3),
ADD COLUMN     "nozzleDiameter" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
ADD COLUMN     "powerWatts" DOUBLE PRECISION NOT NULL DEFAULT 150,
ADD COLUMN     "purchaseCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "serial" TEXT,
ADD COLUMN     "supportedMaterials" TEXT[] DEFAULT ARRAY['PLA', 'PETG', 'ABS', 'TPU']::TEXT[],
ADD COLUMN     "totalPrintHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductionJobTicket" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "bomVersionId" TEXT,
ADD COLUMN     "deadlineRisk" TEXT NOT NULL DEFAULT 'ON_TRACK',
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "productionPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qcResult" TEXT,
ADD COLUMN     "qcTemplate" TEXT DEFAULT 'GENERAL_PRINT',
ADD COLUMN     "reprintFromTicketId" TEXT,
ADD COLUMN     "reprintedByTicketId" TEXT,
ADD COLUMN     "scheduledEndTime" TIMESTAMP(3),
ADD COLUMN     "scheduledStartTime" TIMESTAMP(3),
ADD COLUMN     "spoolId" TEXT;

-- CreateTable
CREATE TABLE "UserPasskey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPasskey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterMaintenanceLog" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterMaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "printerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintFailure" (
    "id" TEXT NOT NULL,
    "jobTicketId" TEXT NOT NULL,
    "printerId" TEXT,
    "spoolId" TEXT,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureReason" TEXT NOT NULL,
    "wastedGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastedMinutes" INTEGER NOT NULL DEFAULT 0,
    "wasteCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "notes" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL DEFAULT 'OTHER',
    "unit" "MaterialUnit" NOT NULL DEFAULT 'PIECE',
    "currentQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incomingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderPoint" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "preferredSupplierId" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialStockHistory" (
    "id" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "reason" TEXT,
    "referenceId" TEXT,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialStockHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentSpool" (
    "id" TEXT NOT NULL,
    "spoolNumber" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'Bambu Lab',
    "materialType" TEXT NOT NULL DEFAULT 'PLA',
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT,
    "diameter" DOUBLE PRECISION NOT NULL DEFAULT 1.75,
    "initialWeightGrams" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "currentWeightGrams" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "tareWeightGrams" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "costPerGram" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "lotNumber" TEXT,
    "supplierId" TEXT,
    "printerId" TEXT,
    "openedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SEALED',
    "printerCompatibility" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilamentSpool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentTransaction" (
    "id" TEXT NOT NULL,
    "spoolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "gramsAfter" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION,
    "jobTicketId" TEXT,
    "reason" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilamentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillOfMaterials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillOfMaterials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillOfMaterialsVersion" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillOfMaterialsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "bomVersionId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" "MaterialUnit" NOT NULL DEFAULT 'PIECE',
    "wasteAllowancePercent" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReservation" (
    "id" TEXT NOT NULL,
    "jobTicketId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "MaterialUnit" NOT NULL DEFAULT 'GRAM',
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "paymentTerms" TEXT DEFAULT 'Net 30',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "minimumOrder" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierMaterial" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "supplierSKU" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedDate" TIMESTAMP(3),
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "orderedQuantity" DOUBLE PRECISION NOT NULL,
    "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostModel" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "filamentCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "componentsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failureAllocationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricityCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depreciationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gatewayFeeEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingSubsidyEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostOfGoods" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetRetailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCostModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCostSnapshot" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricityCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failureAllocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCOGS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCostActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentTracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "awbNumber" TEXT,
    "courierName" TEXT,
    "shipmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MANIFEST_GENERATED',
    "labelUrl" TEXT,
    "trackingUrl" TEXT,
    "quotedCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pickupScheduledAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "rtoReason" TEXT,
    "rtoDecision" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationsSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "rawMaterialsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bomEnabled" BOOLEAN NOT NULL DEFAULT false,
    "purchasingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "courierIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "advancedCostingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "staffRbacEnabled" BOOLEAN NOT NULL DEFAULT false,
    "courierProvider" TEXT NOT NULL DEFAULT 'manual',
    "shiprocketApiKey" TEXT,
    "shiprocketApiSecret" TEXT,
    "kwhElectricityRate" DOUBLE PRECISION NOT NULL DEFAULT 8.5,
    "standardHourlyLaborRate" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "poApprovalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 25000.0,
    "targetGrossMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPasskey_credentialId_key" ON "UserPasskey"("credentialId");

-- CreateIndex
CREATE INDEX "UserPasskey_userId_idx" ON "UserPasskey"("userId");

-- CreateIndex
CREATE INDEX "PrinterMaintenanceLog_printerId_performedAt_idx" ON "PrinterMaintenanceLog"("printerId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_batchNumber_key" ON "ProductionBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "ProductionBatch_status_idx" ON "ProductionBatch"("status");

-- CreateIndex
CREATE INDEX "PrintFailure_jobTicketId_idx" ON "PrintFailure"("jobTicketId");

-- CreateIndex
CREATE INDEX "PrintFailure_failureReason_idx" ON "PrintFailure"("failureReason");

-- CreateIndex
CREATE INDEX "PrintFailure_failedAt_idx" ON "PrintFailure"("failedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialItem_sku_key" ON "MaterialItem"("sku");

-- CreateIndex
CREATE INDEX "MaterialItem_category_active_idx" ON "MaterialItem"("category", "active");

-- CreateIndex
CREATE INDEX "MaterialItem_sku_idx" ON "MaterialItem"("sku");

-- CreateIndex
CREATE INDEX "MaterialStockHistory_materialItemId_createdAt_idx" ON "MaterialStockHistory"("materialItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FilamentSpool_spoolNumber_key" ON "FilamentSpool"("spoolNumber");

-- CreateIndex
CREATE INDEX "FilamentSpool_materialType_status_idx" ON "FilamentSpool"("materialType", "status");

-- CreateIndex
CREATE INDEX "FilamentSpool_materialItemId_idx" ON "FilamentSpool"("materialItemId");

-- CreateIndex
CREATE INDEX "FilamentSpool_status_idx" ON "FilamentSpool"("status");

-- CreateIndex
CREATE INDEX "FilamentTransaction_spoolId_createdAt_idx" ON "FilamentTransaction"("spoolId", "createdAt");

-- CreateIndex
CREATE INDEX "BillOfMaterials_productId_variantId_idx" ON "BillOfMaterials"("productId", "variantId");

-- CreateIndex
CREATE INDEX "BillOfMaterialsVersion_bomId_isCurrent_idx" ON "BillOfMaterialsVersion"("bomId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "BillOfMaterialsVersion_bomId_versionNumber_key" ON "BillOfMaterialsVersion"("bomId", "versionNumber");

-- CreateIndex
CREATE INDEX "BomItem_bomVersionId_idx" ON "BomItem"("bomVersionId");

-- CreateIndex
CREATE INDEX "BomItem_materialItemId_idx" ON "BomItem"("materialItemId");

-- CreateIndex
CREATE INDEX "MaterialReservation_jobTicketId_status_idx" ON "MaterialReservation"("jobTicketId", "status");

-- CreateIndex
CREATE INDEX "MaterialReservation_materialItemId_status_idx" ON "MaterialReservation"("materialItemId", "status");

-- CreateIndex
CREATE INDEX "Supplier_active_idx" ON "Supplier"("active");

-- CreateIndex
CREATE INDEX "SupplierMaterial_materialItemId_idx" ON "SupplierMaterial"("materialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierMaterial_supplierId_materialItemId_key" ON "SupplierMaterial"("supplierId", "materialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_materialItemId_idx" ON "PurchaseOrderItem"("materialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_receiptNumber_key" ON "GoodsReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCostModel_productId_variantId_key" ON "ProductCostModel"("productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCostSnapshot_orderId_key" ON "OrderCostSnapshot"("orderId");

-- CreateIndex
CREATE INDEX "OrderCostSnapshot_orderId_idx" ON "OrderCostSnapshot"("orderId");

-- CreateIndex
CREATE INDEX "ShipmentTracking_orderId_idx" ON "ShipmentTracking"("orderId");

-- CreateIndex
CREATE INDEX "ShipmentTracking_awbNumber_idx" ON "ShipmentTracking"("awbNumber");

-- CreateIndex
CREATE INDEX "ShipmentTracking_status_idx" ON "ShipmentTracking"("status");

-- CreateIndex
CREATE INDEX "OperationalAlert_status_severity_idx" ON "OperationalAlert"("status", "severity");

-- CreateIndex
CREATE INDEX "OperationalAlert_type_idx" ON "OperationalAlert"("type");

-- CreateIndex
CREATE INDEX "ProductionJobTicket_deadlineRisk_idx" ON "ProductionJobTicket"("deadlineRisk");

-- CreateIndex
CREATE INDEX "ProductionJobTicket_batchId_idx" ON "ProductionJobTicket"("batchId");

-- AddForeignKey
ALTER TABLE "UserPasskey" ADD CONSTRAINT "UserPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterMaintenanceLog" ADD CONSTRAINT "PrinterMaintenanceLog_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobTicket" ADD CONSTRAINT "ProductionJobTicket_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobTicket" ADD CONSTRAINT "ProductionJobTicket_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "FilamentSpool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobTicket" ADD CONSTRAINT "ProductionJobTicket_bomVersionId_fkey" FOREIGN KEY ("bomVersionId") REFERENCES "BillOfMaterialsVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintFailure" ADD CONSTRAINT "PrintFailure_jobTicketId_fkey" FOREIGN KEY ("jobTicketId") REFERENCES "ProductionJobTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintFailure" ADD CONSTRAINT "PrintFailure_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintFailure" ADD CONSTRAINT "PrintFailure_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "FilamentSpool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStockHistory" ADD CONSTRAINT "MaterialStockHistory_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentSpool" ADD CONSTRAINT "FilamentSpool_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentSpool" ADD CONSTRAINT "FilamentSpool_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentSpool" ADD CONSTRAINT "FilamentSpool_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentTransaction" ADD CONSTRAINT "FilamentTransaction_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "FilamentSpool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterialsVersion" ADD CONSTRAINT "BillOfMaterialsVersion_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BillOfMaterials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_bomVersionId_fkey" FOREIGN KEY ("bomVersionId") REFERENCES "BillOfMaterialsVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_jobTicketId_fkey" FOREIGN KEY ("jobTicketId") REFERENCES "ProductionJobTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMaterial" ADD CONSTRAINT "SupplierMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMaterial" ADD CONSTRAINT "SupplierMaterial_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostModel" ADD CONSTRAINT "ProductCostModel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostModel" ADD CONSTRAINT "ProductCostModel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostSnapshot" ADD CONSTRAINT "OrderCostSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentTracking" ADD CONSTRAINT "ShipmentTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

