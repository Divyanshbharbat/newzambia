/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `Control` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Control" ADD COLUMN     "sessionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Control_sessionId_key" ON "Control"("sessionId");

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
