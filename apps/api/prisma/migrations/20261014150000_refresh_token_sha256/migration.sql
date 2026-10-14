-- Los hashes bcrypt existentes no son comparables con sha256: se descartan y cada sesión vuelve a iniciar.
DELETE FROM "RefreshToken";

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "previousTokenHash" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_previousTokenHash_idx" ON "RefreshToken"("previousTokenHash");
