-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "ManufacturingStatus" AS ENUM ('new', 'design_pending', 'design_approved', 'printing', 'finishing', 'qc', 'packed', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('prepaid', 'cod');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'pending', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "story" TEXT,
    "specs" JSONB,
    "careInstructions" TEXT[],
    "faq" JSONB,
    "images" TEXT[],
    "videoUrl" TEXT,
    "badge" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 10,
    "productionTimeDays" INTEGER NOT NULL DEFAULT 2,
    "estimatedDispatchDays" INTEGER NOT NULL DEFAULT 3,
    "prepaidOnly" BOOLEAN NOT NULL DEFAULT false,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "finishes" TEXT[],
    "colors" TEXT[],
    "sizes" TEXT[],
    "businessCosts" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "placeholder" TEXT,
    "helpText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "badge" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'prepaid',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "status" "ManufacturingStatus" NOT NULL DEFAULT 'new',
    "qcNotes" TEXT,
    "trackingNumber" TEXT,
    "courierName" TEXT,
    "proofImageUrl" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedFinish" TEXT,
    "selectedColor" TEXT,
    "selectedSize" TEXT,
    "customizations" JSONB,
    "customizationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ManufacturingStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "badgeText" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaUrl" TEXT NOT NULL,
    "secondaryCtaText" TEXT,
    "secondaryCtaUrl" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "secondaryMediaUrl" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0B0B0C',
    "cardBackgroundColor" TEXT NOT NULL DEFAULT '#151515',
    "accentColor" TEXT NOT NULL DEFAULT '#C8FF35',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "secondaryTextColor" TEXT NOT NULL DEFAULT '#B9B9B4',
    "buttonColor" TEXT NOT NULL DEFAULT '#C8FF35',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#0B0B0C',
    "fontFamily" TEXT NOT NULL DEFAULT 'var(--font-geist-sans), sans-serif',
    "headingSizeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "borderRadius" TEXT NOT NULL DEFAULT 'md',
    "cardStyle" TEXT NOT NULL DEFAULT 'glass',

    CONSTRAINT "ThemeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "announcementBarText" TEXT NOT NULL DEFAULT 'ON-DEMAND PRODUCTION • FREE SHIPPING ON ORDERS OVER ₹1999',
    "announcementBarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "brandName" TEXT NOT NULL DEFAULT 'DAXUL LABS',
    "brandTagline" TEXT NOT NULL DEFAULT 'Objects Made Differently.',
    "brandDescription" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL DEFAULT 'studio@daxullabs.com',
    "contactPhone" TEXT NOT NULL DEFAULT '+91 98765 43210',
    "whatsAppNumber" TEXT NOT NULL DEFAULT '+919876543210',
    "instagramUrl" TEXT NOT NULL DEFAULT 'https://instagram.com/daxullabs',
    "footerText" TEXT NOT NULL DEFAULT '© 2026 DAXUL LABS. CRAFTED ON-DEMAND IN INDIA.',
    "standardShippingFee" DOUBLE PRECISION NOT NULL DEFAULT 99,
    "expressShippingFee" DOUBLE PRECISION NOT NULL DEFAULT 199,
    "freeShippingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1999,
    "codFee" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "globalCodEnabled" BOOLEAN NOT NULL DEFAULT true,
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "seoTitle" TEXT NOT NULL DEFAULT 'DAXUL LABS | Designed 3D Printed Objects & Projection Lamps',
    "seoDescription" TEXT NOT NULL,
    "shippingPolicyText" TEXT NOT NULL,
    "returnPolicyText" TEXT NOT NULL,
    "privacyPolicyText" TEXT NOT NULL,
    "termsConditionsText" TEXT NOT NULL,
    "cancellationPolicyText" TEXT NOT NULL,
    "customizationStep1Title" TEXT NOT NULL DEFAULT '1. Upload & Input',
    "customizationStep1Desc" TEXT NOT NULL DEFAULT 'Upload a portrait photo, logo, or enter custom names and dates.',
    "customizationStep2Title" TEXT NOT NULL DEFAULT '2. 3D Design Proof',
    "customizationStep2Desc" TEXT NOT NULL DEFAULT 'Our studio generates a 3D light-refracting model proof.',
    "customizationStep3Title" TEXT NOT NULL DEFAULT '3. Precision Printing',
    "customizationStep3Desc" TEXT NOT NULL DEFAULT 'Crafted layer-by-layer using high-density organic biopolymers.',
    "customizationStep4Title" TEXT NOT NULL DEFAULT '4. Finishing & Delivery',
    "customizationStep4Desc" TEXT NOT NULL DEFAULT 'Hand-finished, LED electronics tested, and dispatched to your door.',

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "adminUserEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayPaymentId_key" ON "Order"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_filename_key" ON "UploadedFile"("filename");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
