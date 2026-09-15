/*
  Warnings:

  - You are about to drop the column `fatherOccupation` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `motherOccupation` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `adhaarCardNo` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "fatherOccupation",
DROP COLUMN "motherOccupation",
ADD COLUMN     "distanceFromSchool" DOUBLE PRECISION,
ADD COLUMN     "preferredPhoneNumber" BIGINT;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "adhaarCardNo",
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "denomination" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "motherTongue" TEXT;
