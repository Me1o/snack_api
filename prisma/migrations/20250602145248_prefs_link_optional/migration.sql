-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_preferencesId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "preferencesId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preferencesId_fkey" FOREIGN KEY ("preferencesId") REFERENCES "Preferences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
