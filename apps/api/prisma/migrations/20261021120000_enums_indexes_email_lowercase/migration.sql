DELETE FROM "User"
WHERE "username" IN ('user1', 'user2')
  AND "role" = 'USER'
  AND lower("email") IN ('juan@example.com', 'maria@example.com');

DO $$
DECLARE
  colliding text;
BEGIN
  SELECT string_agg("username", ', ') INTO colliding
  FROM "User"
  WHERE "email" IS NOT NULL
    AND lower("email") IN (
      SELECT lower("email") FROM "User" WHERE "email" IS NOT NULL GROUP BY lower("email") HAVING count(*) > 1
    );

  IF colliding IS NOT NULL THEN
    RAISE EXCEPTION 'Emails duplicados al normalizar a minúsculas. Usuarios: %', colliding;
  END IF;
END $$;

UPDATE "User" SET "email" = lower("email") WHERE "email" IS NOT NULL AND "email" <> lower("email");

DO $$
DECLARE
  invalid text;
BEGIN
  SELECT string_agg(DISTINCT found.v, ', ') INTO invalid FROM (
    SELECT 'UserPreferences.theme=' || "theme" AS v FROM "UserPreferences" WHERE "theme" NOT IN ('light', 'dark', 'auto')
    UNION ALL
    SELECT 'MediaItem.mediaType=' || "mediaType" FROM "MediaItem" WHERE "mediaType" NOT IN ('movie', 'tv')
    UNION ALL
    SELECT 'MediaItem.status=' || "status" FROM "MediaItem" WHERE "status" NOT IN ('to_watch', 'watching', 'watched')
  ) found;

  IF invalid IS NOT NULL THEN
    RAISE EXCEPTION 'Valores fuera del enum: %', invalid;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'auto');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('movie', 'tv');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('to_watch', 'watching', 'watched');

-- AlterTable
ALTER TABLE "UserPreferences"
  ALTER COLUMN "theme" DROP DEFAULT,
  ALTER COLUMN "theme" TYPE "Theme" USING "theme"::"Theme",
  ALTER COLUMN "theme" SET DEFAULT 'light';

-- AlterTable
ALTER TABLE "MediaItem"
  ALTER COLUMN "mediaType" TYPE "MediaType" USING "mediaType"::"MediaType",
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MediaStatus" USING "status"::"MediaStatus",
  ALTER COLUMN "status" SET DEFAULT 'to_watch';

-- DropIndex
DROP INDEX IF EXISTS "MediaItem_userId_idx";

-- DropIndex
DROP INDEX IF EXISTS "SplitFriend_userId_idx";

-- DropIndex
DROP INDEX IF EXISTS "GymPlanDay_planId_idx";

-- DropIndex
DROP INDEX IF EXISTS "GatheringParticipant_gatheringId_idx";
