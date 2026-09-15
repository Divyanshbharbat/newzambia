/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,college]` on the table `Control` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Control_sessionId_key";

-- AlterTable
ALTER TABLE "Control" ADD COLUMN     "college" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Control_sessionId_college_key" ON "Control"("sessionId", "college");
