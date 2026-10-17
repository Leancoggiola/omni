-- Un recordatorio mensual genera un gasto por cada ciclo completado: reminderId deja de ser único.
DROP INDEX "PersonalExpense_reminderId_key";

-- CreateIndex
CREATE INDEX "PersonalExpense_reminderId_idx" ON "PersonalExpense"("reminderId");

-- Día original de la recurrencia mensual. Los vencimientos que ya quedaron recortados (28, 29, 30) no se pueden
-- recuperar: el ancla se toma de la fecha actual.
ALTER TABLE "ExpenseReminder" ADD COLUMN "anchorDay" INTEGER;
UPDATE "ExpenseReminder" SET "anchorDay" = EXTRACT(DAY FROM "dueDate")::INTEGER;
ALTER TABLE "ExpenseReminder" ALTER COLUMN "anchorDay" SET NOT NULL;
ALTER TABLE "ExpenseReminder" ADD CONSTRAINT "ExpenseReminder_anchorDay_check" CHECK ("anchorDay" BETWEEN 1 AND 31);

-- Antes de crear el índice único parcial se descartan los ítems AUTO pendientes repetidos de un mismo producto,
-- conservando el más reciente. Son derivados: "Generar lista" los vuelve a crear.
DELETE FROM "PantryShoppingListItem"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "pantryProductId"
             ORDER BY "updatedAt" DESC, "id" DESC
           ) AS "position"
    FROM "PantryShoppingListItem"
    WHERE "source" = 'AUTO' AND "checked" = false AND "pantryProductId" IS NOT NULL
  ) AS "ranked"
  WHERE "position" > 1
);

-- Prisma no modela índices parciales: se mantiene a mano.
CREATE UNIQUE INDEX "PantryShoppingListItem_pantryProductId_auto_pending_key"
  ON "PantryShoppingListItem"("pantryProductId")
  WHERE "source" = 'AUTO' AND "checked" = false;
