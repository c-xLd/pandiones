-- Money as whole kuruş (Int) instead of TL in DOUBLE PRECISION. Every value is rounded to the kuruş
-- once here; all later arithmetic is integer. Coupon value splits by type: percent stays a percent.

-- Product
ALTER TABLE "Product" ADD COLUMN "priceKurus" INTEGER, ADD COLUMN "compareAtPriceKurus" INTEGER;
UPDATE "Product" SET "priceKurus" = ROUND("price" * 100)::INTEGER, "compareAtPriceKurus" = CASE WHEN "compareAtPrice" IS NULL THEN NULL ELSE ROUND("compareAtPrice" * 100)::INTEGER END;
ALTER TABLE "Product" ALTER COLUMN "priceKurus" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "price", DROP COLUMN "compareAtPrice";

-- Order
ALTER TABLE "Order" ADD COLUMN "discountKurus" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "totalKurus" INTEGER, ADD COLUMN "giftCardKurus" INTEGER NOT NULL DEFAULT 0;
UPDATE "Order" SET "discountKurus" = ROUND(COALESCE("discountAmount", 0) * 100)::INTEGER, "totalKurus" = ROUND("totalAmount" * 100)::INTEGER, "giftCardKurus" = ROUND(COALESCE("giftCardAmount", 0) * 100)::INTEGER;
ALTER TABLE "Order" ALTER COLUMN "totalKurus" SET NOT NULL;
ALTER TABLE "Order" DROP COLUMN "discountAmount", DROP COLUMN "totalAmount", DROP COLUMN "giftCardAmount";

-- OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "priceKurus" INTEGER;
UPDATE "OrderItem" SET "priceKurus" = ROUND("price" * 100)::INTEGER;
ALTER TABLE "OrderItem" ALTER COLUMN "priceKurus" SET NOT NULL;
ALTER TABLE "OrderItem" DROP COLUMN "price";

-- Coupon
ALTER TABLE "Coupon" ADD COLUMN "discountPercent" INTEGER, ADD COLUMN "discountKurus" INTEGER, ADD COLUMN "minSpendKurus" INTEGER NOT NULL DEFAULT 0;
UPDATE "Coupon" SET
  "discountPercent" = CASE WHEN "discountType" = 'PERCENTAGE' THEN ROUND("discountValue")::INTEGER ELSE NULL END,
  "discountKurus" = CASE WHEN "discountType" = 'PERCENTAGE' THEN NULL ELSE ROUND("discountValue" * 100)::INTEGER END,
  "minSpendKurus" = ROUND(COALESCE("minSpend", 0) * 100)::INTEGER;
ALTER TABLE "Coupon" DROP COLUMN "discountValue", DROP COLUMN "minSpend";

-- PaymentTransaction
ALTER TABLE "PaymentTransaction" ADD COLUMN "amountKurus" INTEGER;
UPDATE "PaymentTransaction" SET "amountKurus" = ROUND("amount" * 100)::INTEGER;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "amountKurus" SET NOT NULL;
ALTER TABLE "PaymentTransaction" DROP COLUMN "amount";

-- GiftCard
ALTER TABLE "GiftCard" ADD COLUMN "initialBalanceKurus" INTEGER, ADD COLUMN "currentBalanceKurus" INTEGER;
UPDATE "GiftCard" SET "initialBalanceKurus" = ROUND("initialBalance" * 100)::INTEGER, "currentBalanceKurus" = ROUND("currentBalance" * 100)::INTEGER;
ALTER TABLE "GiftCard" ALTER COLUMN "initialBalanceKurus" SET NOT NULL, ALTER COLUMN "currentBalanceKurus" SET NOT NULL;
ALTER TABLE "GiftCard" DROP COLUMN "initialBalance", DROP COLUMN "currentBalance";

-- GiftCardUsage
ALTER TABLE "GiftCardUsage" ADD COLUMN "amountKurus" INTEGER;
UPDATE "GiftCardUsage" SET "amountKurus" = ROUND("amount" * 100)::INTEGER;
ALTER TABLE "GiftCardUsage" ALTER COLUMN "amountKurus" SET NOT NULL;
ALTER TABLE "GiftCardUsage" DROP COLUMN "amount";

-- StoreSettings
ALTER TABLE "StoreSettings" ADD COLUMN "shippingFeeKurus" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "freeShippingThresholdKurus" INTEGER, ADD COLUMN "merchantShippingFeeKurus" INTEGER NOT NULL DEFAULT 0;
UPDATE "StoreSettings" SET
  "shippingFeeKurus" = ROUND(COALESCE("shippingFee", 0) * 100)::INTEGER,
  "freeShippingThresholdKurus" = CASE WHEN "freeShippingThreshold" IS NULL THEN NULL ELSE ROUND("freeShippingThreshold" * 100)::INTEGER END,
  "merchantShippingFeeKurus" = ROUND(COALESCE("merchantShippingFee", 0) * 100)::INTEGER;
ALTER TABLE "StoreSettings" DROP COLUMN "shippingFee", DROP COLUMN "freeShippingThreshold", DROP COLUMN "merchantShippingFee";

-- Money columns must never go negative.
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceKurus_nonneg" CHECK ("priceKurus" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_money_nonneg" CHECK ("totalKurus" >= 0 AND "discountKurus" >= 0 AND "giftCardKurus" >= 0);
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_balance_nonneg" CHECK ("currentBalanceKurus" >= 0 AND "initialBalanceKurus" >= 0);
