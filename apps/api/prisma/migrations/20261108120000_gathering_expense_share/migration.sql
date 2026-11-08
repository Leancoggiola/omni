-- Sin filas para un gasto significa que se divide entre todos los participantes actuales de la juntada,
-- así que los gastos existentes no necesitan migración de datos.
-- CreateTable
CREATE TABLE "GatheringExpenseShare" (
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "GatheringExpenseShare_pkey" PRIMARY KEY ("expenseId","participantId")
);

-- CreateIndex
CREATE INDEX "GatheringExpenseShare_participantId_idx" ON "GatheringExpenseShare"("participantId");

-- AddForeignKey
ALTER TABLE "GatheringExpenseShare" ADD CONSTRAINT "GatheringExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "GatheringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringExpenseShare" ADD CONSTRAINT "GatheringExpenseShare_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "GatheringParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
