-- AlterTable
ALTER TABLE "GatheringParticipant" ADD COLUMN "isSelf" BOOLEAN NOT NULL DEFAULT false;

-- A lo sumo un participante propio ("Vos") por juntada. Las juntadas existentes quedan sin participante propio.
CREATE UNIQUE INDEX "GatheringParticipant_gatheringId_isSelf_key" ON "GatheringParticipant"("gatheringId") WHERE "isSelf";
