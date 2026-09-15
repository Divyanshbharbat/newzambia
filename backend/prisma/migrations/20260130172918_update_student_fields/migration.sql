/*
  Warnings:

  - You are about to drop the column `address` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `caste` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "address",
DROP COLUMN "caste",
DROP COLUMN "category",
ADD COLUMN     "correspondenceAddress" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "residentialAddress" TEXT;
