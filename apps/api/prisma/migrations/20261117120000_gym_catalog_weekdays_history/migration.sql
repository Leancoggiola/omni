-- El gimnasio no tiene datos en ningún entorno: la migración reestructura las tablas sin trasladar filas. Si alguna
-- tuviera datos, aborta antes de tocar nada en lugar de perderlos en silencio.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "GymPlan") OR EXISTS (SELECT 1 FROM "GymExercise") THEN
    RAISE EXCEPTION 'El gimnasio tiene datos: esta migración asume tablas vacías y no los traslada';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "GymWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropForeignKey
ALTER TABLE "GymExercise" DROP CONSTRAINT "GymExercise_dayId_fkey";

-- DropIndex
DROP INDEX "GymPlanDay_planId_label_key";

-- DropIndex
DROP INDEX "GymExercise_dayId_idx";

-- AlterTable
ALTER TABLE "GymPlan" ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "GymPlanDay" DROP COLUMN "label",
DROP COLUMN "sortOrder",
ADD COLUMN     "weekday" "GymWeekday" NOT NULL;

-- AlterTable
ALTER TABLE "GymExercise" DROP COLUMN "dayId",
DROP COLUMN "sortOrder",
ADD COLUMN     "nameNormalized" TEXT NOT NULL,
ADD COLUMN     "repsNormalized" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "GymPlanExercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPlanExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExerciseWeightEntry" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weightKg" DECIMAL(8,2) NOT NULL,
    "sets" INTEGER,
    "reps" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymExerciseWeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymPlanExercise_exerciseId_idx" ON "GymPlanExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "GymPlanExercise_dayId_exerciseId_key" ON "GymPlanExercise"("dayId", "exerciseId");

-- CreateIndex
CREATE INDEX "GymExerciseWeightEntry_exerciseId_recordedAt_idx" ON "GymExerciseWeightEntry"("exerciseId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymPlanDay_planId_weekday_key" ON "GymPlanDay"("planId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "GymExercise_userId_nameNormalized_sets_repsNormalized_key" ON "GymExercise"("userId", "nameNormalized", "sets", "repsNormalized");

-- AddForeignKey
ALTER TABLE "GymExercise" ADD CONSTRAINT "GymExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPlanExercise" ADD CONSTRAINT "GymPlanExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "GymPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPlanExercise" ADD CONSTRAINT "GymPlanExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "GymExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExerciseWeightEntry" ADD CONSTRAINT "GymExerciseWeightEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "GymExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma no modela índices parciales: se mantiene a mano. El índice único de arriba trata cada `sets` nulo como
-- distinto, así que sin este "Sentadilla ×8" sin series podría repetirse.
CREATE UNIQUE INDEX "GymExercise_userId_nameNormalized_repsNormalized_no_sets_key"
  ON "GymExercise"("userId", "nameNormalized", "repsNormalized")
  WHERE "sets" IS NULL;
