-- CreateEnum
CREATE TYPE "GymPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PantryUnit" AS ENUM ('UNITS', 'PACKAGES');

-- CreateEnum
CREATE TYPE "PantryCategory" AS ENUM ('DAIRY', 'MEAT', 'FRUIT', 'VEGETABLE', 'GRAINS', 'BEVERAGES', 'SNACKS', 'CONDIMENTS', 'FROZEN', 'CLEANING');

-- CreateEnum
CREATE TYPE "PantryShoppingSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'TRANSPORT', 'ENTERTAINMENT', 'HEALTH', 'EDUCATION', 'HOME', 'CLOTHING', 'SERVICES', 'SUBSCRIPTIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseReminderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ExpenseReminderRecurrence" AS ENUM ('ONCE', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ExpenseReminderStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationPlatform" AS ENUM ('WEB', 'MOBILE', 'RASPBERRY_PI');

-- CreateTable
CREATE TABLE "GymPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "status" "GymPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GymPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" TEXT NOT NULL,
    "currentWeightKg" DECIMAL(8,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "category" "PantryCategory" NOT NULL,
    "unit" "PantryUnit" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "minQuantity" DECIMAL(10,2),
    "expiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryShoppingListItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pantryProductId" TEXT,
    "name" TEXT NOT NULL,
    "source" "PantryShoppingSource" NOT NULL,
    "quantityToBuy" DECIMAL(10,2) NOT NULL,
    "unit" "PantryUnit" NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryShoppingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitFriend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "alias" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitFriend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gathering" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gathering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatheringParticipant" (
    "id" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "friendId" TEXT,
    "displayName" TEXT NOT NULL,

    CONSTRAINT "GatheringParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatheringExpense" (
    "id" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatheringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "reminderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE NOT NULL,
    "priority" "ExpenseReminderPriority" NOT NULL DEFAULT 'MEDIUM',
    "recurrence" "ExpenseReminderRecurrence" NOT NULL,
    "status" "ExpenseReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "NotificationPlatform" NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymPlan_userId_status_idx" ON "GymPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "GymPlanDay_planId_idx" ON "GymPlanDay"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "GymPlanDay_planId_label_key" ON "GymPlanDay"("planId", "label");

-- CreateIndex
CREATE INDEX "GymExercise_dayId_idx" ON "GymExercise"("dayId");

-- CreateIndex
CREATE INDEX "PantryProduct_userId_category_idx" ON "PantryProduct"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PantryProduct_userId_nameNormalized_key" ON "PantryProduct"("userId", "nameNormalized");

-- CreateIndex
CREATE INDEX "PantryShoppingListItem_userId_checked_idx" ON "PantryShoppingListItem"("userId", "checked");

-- CreateIndex
CREATE INDEX "SplitFriend_userId_idx" ON "SplitFriend"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SplitFriend_userId_nameNormalized_key" ON "SplitFriend"("userId", "nameNormalized");

-- CreateIndex
CREATE INDEX "Gathering_userId_isSettled_date_idx" ON "Gathering"("userId", "isSettled", "date");

-- CreateIndex
CREATE INDEX "GatheringParticipant_gatheringId_idx" ON "GatheringParticipant"("gatheringId");

-- CreateIndex
CREATE UNIQUE INDEX "GatheringParticipant_gatheringId_displayName_key" ON "GatheringParticipant"("gatheringId", "displayName");

-- CreateIndex
CREATE INDEX "GatheringExpense_gatheringId_idx" ON "GatheringExpense"("gatheringId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalExpense_reminderId_key" ON "PersonalExpense"("reminderId");

-- CreateIndex
CREATE INDEX "PersonalExpense_userId_date_idx" ON "PersonalExpense"("userId", "date");

-- CreateIndex
CREATE INDEX "PersonalExpense_userId_category_date_idx" ON "PersonalExpense"("userId", "category", "date");

-- CreateIndex
CREATE INDEX "ExpenseReminder_userId_status_dueDate_idx" ON "ExpenseReminder"("userId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "NotificationDevice_userId_isActive_idx" ON "NotificationDevice"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDevice_userId_platform_token_key" ON "NotificationDevice"("userId", "platform", "token");

-- AddForeignKey
ALTER TABLE "GymPlan" ADD CONSTRAINT "GymPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPlanDay" ADD CONSTRAINT "GymPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExercise" ADD CONSTRAINT "GymExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "GymPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryProduct" ADD CONSTRAINT "PantryProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryShoppingListItem" ADD CONSTRAINT "PantryShoppingListItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryShoppingListItem" ADD CONSTRAINT "PantryShoppingListItem_pantryProductId_fkey" FOREIGN KEY ("pantryProductId") REFERENCES "PantryProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitFriend" ADD CONSTRAINT "SplitFriend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gathering" ADD CONSTRAINT "Gathering_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringParticipant" ADD CONSTRAINT "GatheringParticipant_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringParticipant" ADD CONSTRAINT "GatheringParticipant_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "SplitFriend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringExpense" ADD CONSTRAINT "GatheringExpense_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringExpense" ADD CONSTRAINT "GatheringExpense_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "GatheringParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalExpense" ADD CONSTRAINT "PersonalExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalExpense" ADD CONSTRAINT "PersonalExpense_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "ExpenseReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReminder" ADD CONSTRAINT "ExpenseReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDevice" ADD CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
