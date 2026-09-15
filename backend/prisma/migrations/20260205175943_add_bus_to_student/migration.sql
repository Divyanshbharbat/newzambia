-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "busAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "busPrice" DOUBLE PRECISION,
ADD COLUMN     "busStationId" INTEGER;

-- CreateTable
CREATE TABLE "BusStation" (
    "id" SERIAL NOT NULL,
    "stationName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusStation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusStation_stationName_key" ON "BusStation"("stationName");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_busStationId_fkey" FOREIGN KEY ("busStationId") REFERENCES "BusStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
