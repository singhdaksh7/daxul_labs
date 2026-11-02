-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('THREE_D_PRINTER', 'FILAMENT', 'RAW_MATERIAL', 'ELECTRONICS', 'PACKAGING', 'COURIER', 'SHIPPING', 'SOFTWARE', 'DOMAIN', 'HOSTING', 'ADS', 'MARKETING', 'RENT', 'ELECTRICITY', 'INTERNET', 'TOOLS', 'EQUIPMENT', 'MAINTENANCE', 'OFFICE', 'TRAVEL', 'PROFESSIONAL_SERVICES', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountingClassification" AS ENUM ('OPERATING_EXPENSE', 'CAPITAL_EXPENSE', 'INVENTORY_PURCHASE', 'ORDER_DIRECT_COST', 'PARTNER_ADVANCE', 'OTHER');

-- CreateTable
CREATE TABLE "BusinessPartner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownershipPercentage" DOUBLE PRECISION NOT NULL DEFAULT 33.333333,
    "expenseSplitPercentage" DOUBLE PRECISION NOT NULL DEFAULT 33.333333,
    "profitSplitPercentage" DOUBLE PRECISION NOT NULL DEFAULT 33.333333,
    "isPrimarySettlementPartner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerFinancialAccount" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "capitalContributedPaise" BIGINT NOT NULL DEFAULT 0,
    "expensePaidPersonallyPaise" BIGINT NOT NULL DEFAULT 0,
    "amountPayablePaise" BIGINT NOT NULL DEFAULT 0,
    "amountReceivablePaise" BIGINT NOT NULL DEFAULT 0,
    "profitAllocatedPaise" BIGINT NOT NULL DEFAULT 0,
    "profitWithdrawnPaise" BIGINT NOT NULL DEFAULT 0,
    "reimbursementDuePaise" BIGINT NOT NULL DEFAULT 0,
    "netSettlementPositionPaise" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerFinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLedgerEntry" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "direction" TEXT NOT NULL,
    "balanceAfterPaise" BIGINT NOT NULL DEFAULT 0,
    "expenseId" TEXT,
    "emiInstallmentId" TEXT,
    "orderId" TEXT,
    "settlementId" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedEntryId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "PartnerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessExpense" (
    "id" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "classification" "AccountingClassification" NOT NULL DEFAULT 'OPERATING_EXPENSE',
    "vendor" TEXT,
    "invoiceNumber" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmountPaise" BIGINT NOT NULL,
    "taxAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
    "paidByPartnerId" TEXT,
    "isBusinessAccountPaid" BOOLEAN NOT NULL DEFAULT false,
    "isEmi" BOOLEAN NOT NULL DEFAULT false,
    "splitMethod" TEXT NOT NULL DEFAULT 'EQUAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerExpenseShare" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "percentageSnapshot" DOUBLE PRECISION NOT NULL,
    "shareAmountPaise" BIGINT NOT NULL,
    "paidAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "remainingPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAttachment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEmiSchedule" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "purchasePricePaise" BIGINT NOT NULL,
    "downPaymentPaise" BIGINT NOT NULL DEFAULT 0,
    "financedAmountPaise" BIGINT NOT NULL,
    "totalEmiCount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "firstEmiDate" TIMESTAMP(3) NOT NULL,
    "interestRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingFeePaise" BIGINT NOT NULL DEFAULT 0,
    "lenderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseEmiSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEmiInstallment" (
    "id" TEXT NOT NULL,
    "emiScheduleId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalPaise" BIGINT NOT NULL DEFAULT 0,
    "interestPaise" BIGINT NOT NULL DEFAULT 0,
    "amountPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "amountPaidPaise" BIGINT NOT NULL DEFAULT 0,
    "proofMediaUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseEmiInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEmiObligation" (
    "id" TEXT NOT NULL,
    "emiInstallmentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "payableToPartnerId" TEXT,
    "shareAmountPaise" BIGINT NOT NULL,
    "amountPaidPaise" BIGINT NOT NULL DEFAULT 0,
    "remainingPaise" BIGINT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEmiObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettlement" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "fromPartnerId" TEXT NOT NULL,
    "toPartnerId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
    "referenceNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "proofMediaUrl" TEXT,
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettlementAllocation" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "expenseShareId" TEXT,
    "emiObligationId" TEXT,
    "amountAllocatedPaise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSettlementAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCapitalEntry" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CAPITAL_CONTRIBUTION',
    "amountPaise" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerCapitalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerWithdrawal" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PROFIT_WITHDRAWAL',
    "amountPaise" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "reason" TEXT NOT NULL,
    "proofUrl" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitPeriod" (
    "id" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRevenuePaise" BIGINT NOT NULL DEFAULT 0,
    "totalRefundsPaise" BIGINT NOT NULL DEFAULT 0,
    "totalCogsPaise" BIGINT NOT NULL DEFAULT 0,
    "operatingExpensePaise" BIGINT NOT NULL DEFAULT 0,
    "grossProfitPaise" BIGINT NOT NULL DEFAULT 0,
    "netDistributablePaise" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProfitAllocation" (
    "id" TEXT NOT NULL,
    "profitPeriodId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "profitPercentSnapshot" DOUBLE PRECISION NOT NULL,
    "allocatedAmountPaise" BIGINT NOT NULL,
    "withdrawnAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerProfitAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "equalSplitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "primarySettlementPartnerId" TEXT,
    "emiRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "financialYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "profitPeriodFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "superAdminApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartner_userId_key" ON "BusinessPartner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartner_email_key" ON "BusinessPartner"("email");

-- CreateIndex
CREATE INDEX "BusinessPartner_isActive_idx" ON "BusinessPartner"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerFinancialAccount_partnerId_key" ON "PartnerFinancialAccount"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerFinancialAccount_partnerId_idx" ON "PartnerFinancialAccount"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerLedgerEntry_partnerId_createdAt_idx" ON "PartnerLedgerEntry"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerLedgerEntry_type_idx" ON "PartnerLedgerEntry"("type");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessExpense_expenseNumber_key" ON "BusinessExpense"("expenseNumber");

-- CreateIndex
CREATE INDEX "BusinessExpense_category_status_idx" ON "BusinessExpense"("category", "status");

-- CreateIndex
CREATE INDEX "BusinessExpense_expenseDate_idx" ON "BusinessExpense"("expenseDate");

-- CreateIndex
CREATE INDEX "PartnerExpenseShare_partnerId_status_idx" ON "PartnerExpenseShare"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerExpenseShare_expenseId_partnerId_key" ON "PartnerExpenseShare"("expenseId", "partnerId");

-- CreateIndex
CREATE INDEX "ExpenseAttachment_expenseId_idx" ON "ExpenseAttachment"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseEmiSchedule_expenseId_key" ON "ExpenseEmiSchedule"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseEmiInstallment_dueDate_status_idx" ON "ExpenseEmiInstallment"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseEmiInstallment_emiScheduleId_installmentNumber_key" ON "ExpenseEmiInstallment"("emiScheduleId", "installmentNumber");

-- CreateIndex
CREATE INDEX "PartnerEmiObligation_partnerId_status_idx" ON "PartnerEmiObligation"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerEmiObligation_payableToPartnerId_status_idx" ON "PartnerEmiObligation"("payableToPartnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerEmiObligation_emiInstallmentId_partnerId_key" ON "PartnerEmiObligation"("emiInstallmentId", "partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSettlement_settlementNumber_key" ON "PartnerSettlement"("settlementNumber");

-- CreateIndex
CREATE INDEX "PartnerSettlement_fromPartnerId_status_idx" ON "PartnerSettlement"("fromPartnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerSettlement_toPartnerId_status_idx" ON "PartnerSettlement"("toPartnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerSettlementAllocation_settlementId_idx" ON "PartnerSettlementAllocation"("settlementId");

-- CreateIndex
CREATE INDEX "PartnerSettlementAllocation_expenseShareId_idx" ON "PartnerSettlementAllocation"("expenseShareId");

-- CreateIndex
CREATE INDEX "PartnerSettlementAllocation_emiObligationId_idx" ON "PartnerSettlementAllocation"("emiObligationId");

-- CreateIndex
CREATE INDEX "PartnerCapitalEntry_partnerId_type_idx" ON "PartnerCapitalEntry"("partnerId", "type");

-- CreateIndex
CREATE INDEX "PartnerWithdrawal_partnerId_type_idx" ON "PartnerWithdrawal"("partnerId", "type");

-- CreateIndex
CREATE INDEX "ProfitPeriod_status_idx" ON "ProfitPeriod"("status");

-- CreateIndex
CREATE INDEX "ProfitPeriod_startDate_endDate_idx" ON "ProfitPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PartnerProfitAllocation_partnerId_idx" ON "PartnerProfitAllocation"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfitAllocation_profitPeriodId_partnerId_key" ON "PartnerProfitAllocation"("profitPeriodId", "partnerId");

-- AddForeignKey
ALTER TABLE "BusinessPartner" ADD CONSTRAINT "BusinessPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerFinancialAccount" ADD CONSTRAINT "PartnerFinancialAccount_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "BusinessExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessExpense" ADD CONSTRAINT "BusinessExpense_paidByPartnerId_fkey" FOREIGN KEY ("paidByPartnerId") REFERENCES "BusinessPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerExpenseShare" ADD CONSTRAINT "PartnerExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "BusinessExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerExpenseShare" ADD CONSTRAINT "PartnerExpenseShare_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "BusinessExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEmiSchedule" ADD CONSTRAINT "ExpenseEmiSchedule_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "BusinessExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEmiInstallment" ADD CONSTRAINT "ExpenseEmiInstallment_emiScheduleId_fkey" FOREIGN KEY ("emiScheduleId") REFERENCES "ExpenseEmiSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEmiObligation" ADD CONSTRAINT "PartnerEmiObligation_emiInstallmentId_fkey" FOREIGN KEY ("emiInstallmentId") REFERENCES "ExpenseEmiInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEmiObligation" ADD CONSTRAINT "PartnerEmiObligation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEmiObligation" ADD CONSTRAINT "PartnerEmiObligation_payableToPartnerId_fkey" FOREIGN KEY ("payableToPartnerId") REFERENCES "BusinessPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_fromPartnerId_fkey" FOREIGN KEY ("fromPartnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_toPartnerId_fkey" FOREIGN KEY ("toPartnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementAllocation" ADD CONSTRAINT "PartnerSettlementAllocation_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementAllocation" ADD CONSTRAINT "PartnerSettlementAllocation_expenseShareId_fkey" FOREIGN KEY ("expenseShareId") REFERENCES "PartnerExpenseShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementAllocation" ADD CONSTRAINT "PartnerSettlementAllocation_emiObligationId_fkey" FOREIGN KEY ("emiObligationId") REFERENCES "PartnerEmiObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCapitalEntry" ADD CONSTRAINT "PartnerCapitalEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerWithdrawal" ADD CONSTRAINT "PartnerWithdrawal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfitAllocation" ADD CONSTRAINT "PartnerProfitAllocation_profitPeriodId_fkey" FOREIGN KEY ("profitPeriodId") REFERENCES "ProfitPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfitAllocation" ADD CONSTRAINT "PartnerProfitAllocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "BusinessPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

