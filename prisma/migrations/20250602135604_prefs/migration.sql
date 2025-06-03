-- CreateTable
CREATE TABLE "Preferences" (
    "id" SERIAL NOT NULL,
    "politics" TEXT NOT NULL,
    "sports" TEXT NOT NULL,
    "culture" TEXT NOT NULL,
    "economics" TEXT NOT NULL,
    "entertainment" TEXT NOT NULL,
    "science" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "legal" TEXT NOT NULL,
    "general" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);
