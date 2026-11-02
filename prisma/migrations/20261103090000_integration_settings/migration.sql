-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "valueEncrypted" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("key")
);
