-- Non-destructive additive migration for SEO and Google Merchant Center settings
ALTER TABLE "StoreSettings"
ADD COLUMN IF NOT EXISTS "seoDefaultOgImage" TEXT,
ADD COLUMN IF NOT EXISTS "seoRobotsIndexing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "gscVerificationTag" TEXT,
ADD COLUMN IF NOT EXISTS "merchantVerificationTag" TEXT,
ADD COLUMN IF NOT EXISTS "googleAnalyticsId" TEXT,
ADD COLUMN IF NOT EXISTS "merchantFeedEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "merchantBrand" TEXT NOT NULL DEFAULT 'Pandiones',
ADD COLUMN IF NOT EXISTS "merchantShippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "merchantTransitDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "imageQuality" INTEGER NOT NULL DEFAULT 85;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "noindex" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "excludeFromFeed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "noindex" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "PageSeoOverride" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "ogImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageSeoOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PageSeoOverride_path_key" ON "PageSeoOverride"("path");
