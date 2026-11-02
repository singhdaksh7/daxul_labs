-- Phase C: Retention, Loyalty, Referrals, Gift Cards, Store Credit, Lifecycle Automation

-- 1. AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "loyaltyPointsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "loyaltyPointsDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "storeCreditUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "giftCardCodeUsed" TEXT,
ADD COLUMN IF NOT EXISTS "giftCardDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 2. CreateTable RetentionSettings
CREATE TABLE IF NOT EXISTS "RetentionSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "referralsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "giftCardsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "storeCreditEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "winbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pointsPer100Rupees" INTEGER NOT NULL DEFAULT 1,
    "redemptionValuePerPoint" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "minimumRedemptionPoints" INTEGER NOT NULL DEFAULT 50,
    "maxOrderRedemptionPercent" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "pointExpiryDays" INTEGER NOT NULL DEFAULT 365,
    "loyaltyPendingDays" INTEGER NOT NULL DEFAULT 7,
    "loyaltyEarningMinOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "excludedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedCollectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referralRewardType" TEXT NOT NULL DEFAULT 'points',
    "referralRewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "referralReferredRewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "referralMinOrderSpend" DOUBLE PRECISION NOT NULL DEFAULT 999,
    "referralQualifyEvent" TEXT NOT NULL DEFAULT 'DELIVERED',
    "giftCardExpiryDays" INTEGER NOT NULL DEFAULT 365,
    "customGiftCardMin" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "customGiftCardMax" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "reviewRequestDelayDays" INTEGER NOT NULL DEFAULT 5,
    "reviewRewardPoints" INTEGER NOT NULL DEFAULT 25,
    "winbackInactivityDays" INTEGER NOT NULL DEFAULT 60,
    "winbackDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "whatsappProvider" TEXT NOT NULL DEFAULT 'mock',
    "whatsappApiKey" TEXT,
    "whatsappApiUrl" TEXT,
    "whatsappPhoneNumberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionSettings_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable LoyaltyAccount
CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "pendingPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRedeemed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_availablePoints_idx" ON "LoyaltyAccount"("availablePoints");

-- 4. CreateTable LoyaltyTransaction
CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "refundId" TEXT,
    "referralId" TEXT,
    "adminUserId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_accountId_createdAt_idx" ON "LoyaltyTransaction"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_type_status_idx" ON "LoyaltyTransaction"("type", "status");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_expiresAt_idx" ON "LoyaltyTransaction"("expiresAt");

-- 5. CreateTable ReferralCode
CREATE TABLE IF NOT EXISTS "ReferralCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_userId_key" ON "ReferralCode"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX IF NOT EXISTS "ReferralCode_code_idx" ON "ReferralCode"("code");

-- 6. CreateTable Referral
CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "qualifyingOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referrerUserId_referredUserId_key" ON "Referral"("referrerUserId", "referredUserId");
CREATE INDEX IF NOT EXISTS "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Referral_codeId_idx" ON "Referral"("codeId");
CREATE INDEX IF NOT EXISTS "Referral_qualifyingOrderId_idx" ON "Referral"("qualifyingOrderId");

-- 7. CreateTable ReferralReward
CREATE TABLE IF NOT EXISTS "ReferralReward" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReferralReward_referralId_idx" ON "ReferralReward"("referralId");

-- 8. CreateTable GiftCard
CREATE TABLE IF NOT EXISTS "GiftCard" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "maskedCode" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purchaserUserId" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "personalMessage" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GiftCard_codeHash_key" ON "GiftCard"("codeHash");
CREATE INDEX IF NOT EXISTS "GiftCard_status_remainingBalance_idx" ON "GiftCard"("status", "remainingBalance");
CREATE INDEX IF NOT EXISTS "GiftCard_recipientEmail_idx" ON "GiftCard"("recipientEmail");
CREATE INDEX IF NOT EXISTS "GiftCard_purchaserUserId_idx" ON "GiftCard"("purchaserUserId");

-- 9. CreateTable GiftCardTransaction
CREATE TABLE IF NOT EXISTS "GiftCardTransaction" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GiftCardTransaction_giftCardId_createdAt_idx" ON "GiftCardTransaction"("giftCardId", "createdAt");
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_orderId_idx" ON "GiftCardTransaction"("orderId");

-- 10. CreateTable StoreCreditAccount
CREATE TABLE IF NOT EXISTS "StoreCreditAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetimeCredited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetimeDebited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCreditAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreCreditAccount_userId_key" ON "StoreCreditAccount"("userId");
CREATE INDEX IF NOT EXISTS "StoreCreditAccount_availableBalance_idx" ON "StoreCreditAccount"("availableBalance");

-- 11. CreateTable StoreCreditTransaction
CREATE TABLE IF NOT EXISTS "StoreCreditTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "adminUserId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StoreCreditTransaction_accountId_createdAt_idx" ON "StoreCreditTransaction"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "StoreCreditTransaction_type_idx" ON "StoreCreditTransaction"("type");
CREATE INDEX IF NOT EXISTS "StoreCreditTransaction_orderId_idx" ON "StoreCreditTransaction"("orderId");

-- 12. CreateTable CustomerSegment
CREATE TABLE IF NOT EXISTS "CustomerSegment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cachedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerSegment_slug_key" ON "CustomerSegment"("slug");
CREATE INDEX IF NOT EXISTS "CustomerSegment_isActive_idx" ON "CustomerSegment"("isActive");

-- 13. CreateTable NotificationTemplate
CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- 14. CreateTable NotificationAutomation
CREATE TABLE IF NOT EXISTS "NotificationAutomation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "templateId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "maxFrequencyDays" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationAutomation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationAutomation_triggerEvent_isEnabled_idx" ON "NotificationAutomation"("triggerEvent", "isEnabled");

-- 15. CreateTable NotificationJob
CREATE TABLE IF NOT EXISTS "NotificationJob" (
    "id" TEXT NOT NULL,
    "automationId" TEXT,
    "templateId" TEXT,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationJob_idempotencyKey_key" ON "NotificationJob"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "NotificationJob_status_scheduledFor_idx" ON "NotificationJob"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "NotificationJob_recipient_status_idx" ON "NotificationJob"("recipient", "status");

-- Foreign key constraints with IF NOT EXISTS checks or safety
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_qualifyingOrderId_fkey" FOREIGN KEY ("qualifyingOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchaserUserId_fkey" FOREIGN KEY ("purchaserUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoreCreditAccount" ADD CONSTRAINT "StoreCreditAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreCreditTransaction" ADD CONSTRAINT "StoreCreditTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StoreCreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreCreditTransaction" ADD CONSTRAINT "StoreCreditTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationAutomation" ADD CONSTRAINT "NotificationAutomation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "NotificationAutomation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

