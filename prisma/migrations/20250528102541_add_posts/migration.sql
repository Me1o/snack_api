-- CreateEnum
CREATE TYPE "categories" AS ENUM ('Politics', 'Sports', 'Culture', 'Economics', 'Entertainment', 'Science', 'Business', 'Technology', 'Legal', 'General');

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "category" "categories"[] DEFAULT ARRAY[]::"categories"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
