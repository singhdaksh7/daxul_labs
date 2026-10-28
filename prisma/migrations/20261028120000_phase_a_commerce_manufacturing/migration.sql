-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "damagedStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "incomingStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "damagedStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "incomingStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancellationRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "refundStatus" TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "designProofUrl" TEXT,
ADD COLUMN IF NOT EXISTS "designStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "designNotes" TEXT,
ADD COLUMN IF NOT EXISTS "designFeedback" TEXT;

-- Create Indexes for Order
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx" ON "Order"("customerEmail");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");

-- CreateTable Address
CREATE TABLE IF NOT EXISTS "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Address_userId_idx" ON "Address"("userId");

-- CreateTable WishlistItem
CREATE TABLE IF NOT EXISTS "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");
CREATE INDEX IF NOT EXISTS "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateTable OrderRefund
CREATE TABLE IF NOT EXISTS "OrderRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "gatewayRefundId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "adminEmail" TEXT NOT NULL,
    "restockedInventory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRefund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderRefund_orderId_idx" ON "OrderRefund"("orderId");

-- CreateTable PaymentTransaction
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'razorpay',
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "method" TEXT,
    "errorDescription" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_gatewayPaymentId_idx" ON "PaymentTransaction"("gatewayPaymentId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_gatewayOrderId_idx" ON "PaymentTransaction"("gatewayOrderId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateTable AbandonedCheckout
CREATE TABLE IF NOT EXISTS "AbandonedCheckout" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "customerName" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStep" TEXT NOT NULL DEFAULT 'contact',
    "convertedOrderId" TEXT,
    "isRecovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveryToken" TEXT NOT NULL,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCheckout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AbandonedCheckout_cartId_key" ON "AbandonedCheckout"("cartId");
CREATE UNIQUE INDEX IF NOT EXISTS "AbandonedCheckout_recoveryToken_key" ON "AbandonedCheckout"("recoveryToken");
CREATE INDEX IF NOT EXISTS "AbandonedCheckout_isRecovered_createdAt_idx" ON "AbandonedCheckout"("isRecovered", "createdAt");
CREATE INDEX IF NOT EXISTS "AbandonedCheckout_email_idx" ON "AbandonedCheckout"("email");

-- CreateTable Printer
CREATE TABLE IF NOT EXISTS "Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductionJobTicket
CREATE TABLE IF NOT EXISTS "ProductionJobTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "printerId" TEXT,
    "material" TEXT,
    "color" TEXT,
    "designFileUrl" TEXT,
    "estimatedGrams" DOUBLE PRECISION,
    "actualGrams" DOUBLE PRECISION,
    "estimatedDurationMinutes" INTEGER,
    "actualDurationMinutes" INTEGER,
    "operator" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "failureReason" TEXT,
    "qcChecklist" JSONB,
    "qcNotes" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionJobTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductionJobTicket_ticketNumber_key" ON "ProductionJobTicket"("ticketNumber");
CREATE INDEX IF NOT EXISTS "ProductionJobTicket_status_idx" ON "ProductionJobTicket"("status");
CREATE INDEX IF NOT EXISTS "ProductionJobTicket_orderId_idx" ON "ProductionJobTicket"("orderId");

-- CreateTable NotificationLog
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationLog_recipient_createdAt_idx" ON "NotificationLog"("recipient", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_event_status_idx" ON "NotificationLog"("event", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobTicket" ADD CONSTRAINT "ProductionJobTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobTicket" ADD CONSTRAINT "ProductionJobTicket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobTicket" ADD CONSTRAINT "ProductionJobTicket_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
