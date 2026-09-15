-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInventory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantityPurchased" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentInventory_studentId_inventoryId_key" ON "StudentInventory"("studentId", "inventoryId");

-- AddForeignKey
ALTER TABLE "StudentInventory" ADD CONSTRAINT "StudentInventory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInventory" ADD CONSTRAINT "StudentInventory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
