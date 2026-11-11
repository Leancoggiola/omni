-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdInvite" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id")
);

-- Un hogar propio para cada usuario existente
INSERT INTO "Household" ("id") SELECT 'hh_' || "id" FROM "User";
INSERT INTO "HouseholdMember" ("id", "householdId", "userId")
SELECT 'hm_' || "id", 'hh_' || "id", "id" FROM "User";

-- MediaItem: de userId a householdId + createdById
ALTER TABLE "MediaItem" ADD COLUMN "householdId" TEXT, ADD COLUMN "createdById" TEXT;
UPDATE "MediaItem" SET "householdId" = 'hh_' || "userId", "createdById" = "userId";
ALTER TABLE "MediaItem" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "MediaItem" DROP COLUMN "userId";

-- PantryProduct
ALTER TABLE "PantryProduct" ADD COLUMN "householdId" TEXT, ADD COLUMN "createdById" TEXT;
UPDATE "PantryProduct" SET "householdId" = 'hh_' || "userId", "createdById" = "userId";
ALTER TABLE "PantryProduct" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "PantryProduct" DROP COLUMN "userId";

-- PantryShoppingListItem
ALTER TABLE "PantryShoppingListItem" ADD COLUMN "householdId" TEXT, ADD COLUMN "createdById" TEXT;
UPDATE "PantryShoppingListItem" SET "householdId" = 'hh_' || "userId", "createdById" = "userId";
ALTER TABLE "PantryShoppingListItem" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "PantryShoppingListItem" DROP COLUMN "userId";

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_userId_key" ON "HouseholdMember"("userId");
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");
CREATE UNIQUE INDEX "HouseholdInvite_codeHash_key" ON "HouseholdInvite"("codeHash");
CREATE INDEX "HouseholdInvite_householdId_idx" ON "HouseholdInvite"("householdId");
CREATE UNIQUE INDEX "MediaItem_householdId_tmdbId_mediaType_key" ON "MediaItem"("householdId", "tmdbId", "mediaType");
CREATE UNIQUE INDEX "PantryProduct_householdId_nameNormalized_key" ON "PantryProduct"("householdId", "nameNormalized");
CREATE INDEX "PantryProduct_householdId_category_idx" ON "PantryProduct"("householdId", "category");
CREATE INDEX "PantryShoppingListItem_householdId_checked_idx" ON "PantryShoppingListItem"("householdId", "checked");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PantryProduct" ADD CONSTRAINT "PantryProduct_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PantryProduct" ADD CONSTRAINT "PantryProduct_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PantryShoppingListItem" ADD CONSTRAINT "PantryShoppingListItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PantryShoppingListItem" ADD CONSTRAINT "PantryShoppingListItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
