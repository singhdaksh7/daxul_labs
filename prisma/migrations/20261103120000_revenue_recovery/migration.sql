-- Additive: recovery mode on expenses, recoveries table, profit-period deduction.
ALTER TABLE "BusinessExpense" ADD COLUMN IF NOT EXISTS "recoveryMode" TEXT NOT NULL DEFAULT 'PARTNER_SPLIT';

ALTER TABLE "ProfitPeriod" ADD COLUMN IF NOT EXISTS "revenueRecoveryPaise" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ExpenseRevenueRecovery" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "recoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseRevenueRecovery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExpenseRevenueRecovery_expenseId_idx" ON "ExpenseRevenueRecovery"("expenseId");
CREATE INDEX IF NOT EXISTS "ExpenseRevenueRecovery_recoveredAt_idx" ON "ExpenseRevenueRecovery"("recoveredAt");

DO $$ BEGIN
  ALTER TABLE "ExpenseRevenueRecovery" ADD CONSTRAINT "ExpenseRevenueRecovery_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "BusinessExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
