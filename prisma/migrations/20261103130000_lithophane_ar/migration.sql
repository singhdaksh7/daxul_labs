-- AlterTable
ALTER TABLE "LithophaneVariety" ADD COLUMN IF NOT EXISTS "arEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LithophaneVariety" ADD COLUMN IF NOT EXISTS "arPlacementType" TEXT NOT NULL DEFAULT 'floor';
ALTER TABLE "LithophaneVariety" ADD COLUMN IF NOT EXISTS "arModelSource" TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE "LithophaneVariety" ADD COLUMN IF NOT EXISTS "arScaleMode" TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE "LithophaneVariety" ADD COLUMN IF NOT EXISTS "arBaseOffset" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "LithophaneVariety" ADD COLUMN IF NOT EXISTS "supportsArLighting" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LithophaneGeneration" ADD COLUMN IF NOT EXISTS "arGlbMediaId" TEXT;
ALTER TABLE "LithophaneGeneration" ADD COLUMN IF NOT EXISTS "arUsdzMediaId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LithophaneArSession" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "modelPath" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LithophaneArSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LithophaneArSession_tokenHash_key" ON "LithophaneArSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "LithophaneArSession_tokenHash_idx" ON "LithophaneArSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "LithophaneArSession_generationId_idx" ON "LithophaneArSession"("generationId");
CREATE INDEX IF NOT EXISTS "LithophaneArSession_expiresAt_idx" ON "LithophaneArSession"("expiresAt");

