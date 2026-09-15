/*
  Warnings:

  - You are about to drop the column `station` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Control" ADD COLUMN     "lunchFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "station",
ADD COLUMN     "gender" TEXT;
