/*
  Warnings:

  - A unique constraint covering the columns `[streamKeyHash]` on the table `Venue` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "streamKeyHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Venue_streamKeyHash_key" ON "Venue"("streamKeyHash");
