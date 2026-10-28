-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "relatedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable SearchQueryLog
CREATE TABLE IF NOT EXISTS "SearchQueryLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQueryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SearchQueryLog_query_idx" ON "SearchQueryLog"("query");
CREATE INDEX IF NOT EXISTS "SearchQueryLog_createdAt_idx" ON "SearchQueryLog"("createdAt");

-- CreateTable ProductReview
CREATE TABLE IF NOT EXISTS "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminResponse" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductReview_productId_status_idx" ON "ProductReview"("productId", "status");
CREATE INDEX IF NOT EXISTS "ProductReview_status_createdAt_idx" ON "ProductReview"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductReview_authorEmail_idx" ON "ProductReview"("authorEmail");

-- CreateTable BackInStockSubscription
CREATE TABLE IF NOT EXISTS "BackInStockSubscription" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackInStockSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BackInStockSubscription_productId_variantId_email_key" ON "BackInStockSubscription"("productId", "variantId", "email");
CREATE INDEX IF NOT EXISTS "BackInStockSubscription_productId_status_idx" ON "BackInStockSubscription"("productId", "status");
CREATE INDEX IF NOT EXISTS "BackInStockSubscription_email_idx" ON "BackInStockSubscription"("email");

-- CreateTable UserSavedCart
CREATE TABLE IF NOT EXISTS "UserSavedCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cartItems" JSONB NOT NULL DEFAULT '[]',
    "savedForLater" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedCart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSavedCart_userId_key" ON "UserSavedCart"("userId");

-- CreateTable ProductQuestion
CREATE TABLE IF NOT EXISTS "ProductQuestion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductQuestion_productId_status_idx" ON "ProductQuestion"("productId", "status");
CREATE INDEX IF NOT EXISTS "ProductQuestion_status_createdAt_idx" ON "ProductQuestion"("status", "createdAt");

-- CreateTable ProductAnswer
CREATE TABLE IF NOT EXISTS "ProductAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductAnswer_questionId_idx" ON "ProductAnswer"("questionId");

-- CreateTable FunnelEvent
CREATE TABLE IF NOT EXISTS "FunnelEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "step" TEXT NOT NULL,
    "productId" TEXT,
    "orderId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FunnelEvent_step_createdAt_idx" ON "FunnelEvent"("step", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_sessionId_step_idx" ON "FunnelEvent"("sessionId", "step");
CREATE INDEX IF NOT EXISTS "FunnelEvent_productId_step_idx" ON "FunnelEvent"("productId", "step");
CREATE INDEX IF NOT EXISTS "FunnelEvent_orderId_idx" ON "FunnelEvent"("orderId");

-- Foreign key constraints with safe check
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductReview_productId_fkey') THEN
        ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductReview_userId_fkey') THEN
        ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BackInStockSubscription_productId_fkey') THEN
        ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserSavedCart_userId_fkey') THEN
        ALTER TABLE "UserSavedCart" ADD CONSTRAINT "UserSavedCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductQuestion_productId_fkey') THEN
        ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductQuestion_userId_fkey') THEN
        ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAnswer_questionId_fkey') THEN
        ALTER TABLE "ProductAnswer" ADD CONSTRAINT "ProductAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ProductQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
