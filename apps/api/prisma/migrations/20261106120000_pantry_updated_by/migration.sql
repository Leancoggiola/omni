-- AlterTable
ALTER TABLE "PantryProduct" ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "PantryShoppingListItem" ADD COLUMN "updatedById" TEXT;

-- AddForeignKey
ALTER TABLE "PantryProduct" ADD CONSTRAINT "PantryProduct_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryShoppingListItem" ADD CONSTRAINT "PantryShoppingListItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
