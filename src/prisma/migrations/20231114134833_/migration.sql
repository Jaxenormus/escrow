/*
  Warnings:

  - You are about to drop the column `channel` on the `Job` table. All the data in the column will be lost.
  - Added the required column `channelId` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Job_channel_idx";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "channel",
ADD COLUMN     "channelId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Job_channelId_idx" ON "Job"("channelId");
