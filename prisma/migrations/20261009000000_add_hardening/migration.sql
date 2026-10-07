-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shippingMethod" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "stockReleasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "expressShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "standardShippingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "emailKey" TEXT NOT NULL,
    "ipKey" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_emailKey_ipKey_createdAt_idx" ON "LoginAttempt"("emailKey", "ipKey", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipKey_createdAt_idx" ON "LoginAttempt"("ipKey", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

