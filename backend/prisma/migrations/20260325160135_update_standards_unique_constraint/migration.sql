/*
  Warnings:

  - A unique constraint covering the columns `[stationName,college]` on the table `BusStation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rollNo,standard,college]` on the table `Hostel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bed_number,college]` on the table `Hostel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[installments,college]` on the table `Installments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,subjectId,examinationType,college]` on the table `Marks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[year,college]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,college]` on the table `StandardCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[std,category,college]` on the table `Standards` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[standard,rollNo,session,college]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,stdId,college]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username,college]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `college` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `BusStation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Fee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Hostel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Installments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Marks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `StandardCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Standards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `college` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `stdId` on the `Subject` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_stdId_fkey";

-- DropIndex
DROP INDEX "BusStation_stationName_key";

-- DropIndex
DROP INDEX "Hostel_bed_number_key";

-- DropIndex
DROP INDEX "Hostel_rollNo_standard_key";

-- DropIndex
DROP INDEX "Installments_installments_key";

-- DropIndex
DROP INDEX "Marks_studentId_subjectId_examinationType_key";

-- DropIndex
DROP INDEX "Session_year_key";

-- DropIndex
DROP INDEX "StandardCategory_name_key";

-- DropIndex
DROP INDEX "Standards_std_key";

-- DropIndex
DROP INDEX "Student_standard_rollNo_session_key";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BusStation" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Hostel" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Installments" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Marks" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StandardCategory" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Standards" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "college" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "college" TEXT NOT NULL,
DROP COLUMN "stdId",
ADD COLUMN     "stdId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BusStation_stationName_college_key" ON "BusStation"("stationName", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Hostel_rollNo_standard_college_key" ON "Hostel"("rollNo", "standard", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Hostel_bed_number_college_key" ON "Hostel"("bed_number", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Installments_installments_college_key" ON "Installments"("installments", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Marks_studentId_subjectId_examinationType_college_key" ON "Marks"("studentId", "subjectId", "examinationType", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Session_year_college_key" ON "Session"("year", "college");

-- CreateIndex
CREATE UNIQUE INDEX "StandardCategory_name_college_key" ON "StandardCategory"("name", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Standards_std_category_college_key" ON "Standards"("std", "category", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Student_standard_rollNo_session_college_key" ON "Student"("standard", "rollNo", "session", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_stdId_college_key" ON "Subject"("name", "stdId", "college");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_college_key" ON "User"("username", "college");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_stdId_fkey" FOREIGN KEY ("stdId") REFERENCES "Standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
