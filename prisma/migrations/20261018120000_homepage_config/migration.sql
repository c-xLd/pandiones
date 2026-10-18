-- Create HomePageConfig table
CREATE TABLE IF NOT EXISTS "HomePageConfig" (
    "id" TEXT NOT NULL DEFAULT 'homepage',
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "HomePageConfig_pkey" PRIMARY KEY ("id")
);
