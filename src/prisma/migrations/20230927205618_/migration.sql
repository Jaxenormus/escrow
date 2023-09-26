/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Address` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Address" DROP COLUMN "createdAt",
DROP COLUMN "type",
DROP COLUMN "updatedAt";

-- DropEnum
DROP TYPE "AddressType";

-- DropEnum
DROP TYPE "TradeMediums";
