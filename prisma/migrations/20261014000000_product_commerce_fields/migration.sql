-- Ürün düzenleyicisi: piyasa fiyatı, KDV oranı, beden başına SKU ve barkod; sipariş satırına KDV oranı.
-- Yalnız ekleme; var olan veri değişmez (KDV varsayılanı %10 = giyim).
ALTER TABLE "Product" ADD COLUMN "compareAtPrice" DOUBLE PRECISION,
ADD COLUMN "vatRate" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "Variant" ADD COLUMN "sku" TEXT,
ADD COLUMN "barcode" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN "vatRate" INTEGER;

CREATE UNIQUE INDEX "Variant_sku_key" ON "Variant"("sku");
CREATE UNIQUE INDEX "Variant_barcode_key" ON "Variant"("barcode");
