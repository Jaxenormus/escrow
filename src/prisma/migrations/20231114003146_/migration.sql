-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_channel_idx" ON "Job"("channel");
