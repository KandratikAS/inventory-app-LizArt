/*
  Warnings:

  - A unique constraint covering the columns `[apiToken]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "apiToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_apiToken_key" ON "Inventory"("apiToken");
