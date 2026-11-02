-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "lithophaneSnapshot" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "lithophaneStage" TEXT;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN IF NOT EXISTS "ownerToken" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LithophaneSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "productId" TEXT,
    "defaultVarietyId" TEXT,
    "defaultOrientation" TEXT NOT NULL DEFAULT 'portrait',
    "defaultCropStrategy" TEXT NOT NULL DEFAULT 'center',
    "defaultThicknessMm" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "minThicknessMm" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "previewResolution" INTEGER NOT NULL DEFAULT 160,
    "productionResolution" INTEGER NOT NULL DEFAULT 640,
    "allowCustomDimensions" BOOLEAN NOT NULL DEFAULT false,
    "customMinMm" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "customMaxMm" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "customPricePer100Cm2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "headline" TEXT NOT NULL DEFAULT 'Turn your photo into light',
    "subheadline" TEXT NOT NULL DEFAULT 'Upload a photo. We turn it into a custom 3D-printed lithophane.',
    "uploadGuidance" TEXT NOT NULL DEFAULT 'Use a clear, well-lit photo. Avoid blurry or very dark images.',
    "previewDisclaimer" TEXT NOT NULL DEFAULT 'Preview is a visual simulation. Final printed result may vary slightly depending on image quality and selected size.',
    "leadTimeText" TEXT NOT NULL DEFAULT 'Ships in 5-7 working days after design approval',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LithophaneSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LithophaneVariety" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT,
    "baseModel" TEXT NOT NULL DEFAULT '',
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supportsLight" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultSizeId" TEXT,
    "optionGroups" JSONB NOT NULL DEFAULT '[]',
    "productionDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LithophaneVariety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LithophaneSize" (
    "id" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "depthMm" DOUBLE PRECISION,
    "thicknessMm" DOUBLE PRECISION NOT NULL,
    "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productionNotes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LithophaneSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LithophaneGeneration" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PREVIEW',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "uploadFilename" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "resolution" INTEGER NOT NULL,
    "ownerToken" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LithophaneGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LithophaneVariety_key_key" ON "LithophaneVariety"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LithophaneSize_varietyId_idx" ON "LithophaneSize"("varietyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LithophaneGeneration_uploadFilename_idx" ON "LithophaneGeneration"("uploadFilename");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LithophaneGeneration_hash_kind_key" ON "LithophaneGeneration"("hash", "kind");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "LithophaneSize" ADD CONSTRAINT "LithophaneSize_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "LithophaneVariety"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
