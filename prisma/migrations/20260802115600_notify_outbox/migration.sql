-- CreateEnum
CREATE TYPE "NotifyOutboxStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "NotifyOutbox" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotifyOutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotifyOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotifyOutbox_status_createdAt_idx" ON "NotifyOutbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotifyOutbox_itemId_idx" ON "NotifyOutbox"("itemId");

-- AddForeignKey
ALTER TABLE "NotifyOutbox" ADD CONSTRAINT "NotifyOutbox_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
