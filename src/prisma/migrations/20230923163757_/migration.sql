/*
  Warnings:

  - Added the required column `type` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('Bitcoin', 'Ethereum', 'Litecoin');

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "type" "AddressType" NOT NULL;
