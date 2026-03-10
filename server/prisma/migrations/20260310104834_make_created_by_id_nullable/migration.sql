-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_createdById_fkey";

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
