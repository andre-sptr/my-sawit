-- CreateTable
CREATE TABLE IF NOT EXISTS "Kapling" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Harvest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaplingId" TEXT NOT NULL,
    "harvestDate" DATETIME NOT NULL,
    "weightKg" REAL NOT NULL,
    "photoPath" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Harvest_kaplingId_fkey" FOREIGN KEY ("kaplingId") REFERENCES "Kapling" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Maintenance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaplingId" TEXT NOT NULL,
    "activityDate" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "cost" REAL,
    "photoPath" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Maintenance_kaplingId_fkey" FOREIGN KEY ("kaplingId") REFERENCES "Kapling" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaplingId" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "photoPath" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_kaplingId_fkey" FOREIGN KEY ("kaplingId") REFERENCES "Kapling" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaplingId" TEXT NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "weightKg" REAL NOT NULL,
    "pricePerKg" REAL NOT NULL,
    "photoPath" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_kaplingId_fkey" FOREIGN KEY ("kaplingId") REFERENCES "Kapling" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Kapling_name_key" ON "Kapling"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Harvest_kaplingId_harvestDate_idx" ON "Harvest"("kaplingId", "harvestDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Maintenance_kaplingId_activityDate_idx" ON "Maintenance"("kaplingId", "activityDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_kaplingId_expenseDate_idx" ON "Expense"("kaplingId", "expenseDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_kaplingId_saleDate_idx" ON "Sale"("kaplingId", "saleDate");
