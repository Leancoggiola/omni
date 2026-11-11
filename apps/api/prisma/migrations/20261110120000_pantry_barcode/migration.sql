-- AlterTable
ALTER TABLE "PantryProduct" ADD COLUMN "barcode" TEXT;

-- CreateTable
CREATE TABLE "BarcodeCatalogEntry" (
    "barcode" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL,
    "name" TEXT,
    "brand" TEXT,
    "packageSize" TEXT,
    "category" "PantryCategory",
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeCatalogEntry_pkey" PRIMARY KEY ("barcode")
);

-- CreateIndex
CREATE UNIQUE INDEX "PantryProduct_householdId_barcode_key" ON "PantryProduct"("householdId", "barcode");
