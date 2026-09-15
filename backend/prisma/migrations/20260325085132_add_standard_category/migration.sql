/*
  Warnings:

  - You are about to drop the column `totalMarks` on the `Subject` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Control" ADD CONSTRAINT "Control_pkey" PRIMARY KEY ("id");

-- DropIndex
DROP INDEX "Control_id_key";

-- AlterTable
ALTER TABLE "Standards" ALTER COLUMN "totalFees" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Subject" DROP COLUMN "totalMarks";

-- CreateTable
CREATE TABLE "StandardCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "StandardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StandardCategory_name_key" ON "StandardCategory"("name");
