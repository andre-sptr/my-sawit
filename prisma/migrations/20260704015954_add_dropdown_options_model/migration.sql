-- DropdownOption: tabel baru untuk menyimpan opsi dropdown custom
CREATE TABLE IF NOT EXISTS "DropdownOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DropdownOption_group_value_key" ON "DropdownOption"("group", "value");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DropdownOption_group_idx" ON "DropdownOption"("group");
