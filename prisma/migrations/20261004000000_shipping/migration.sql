-- Dilim 5: PTT gönderileri ve kargo göndericisi. Yalnız ekleme; var olan veri değişmez.
-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "defaultDesi" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "senderAddress" TEXT,
ADD COLUMN     "senderCity" TEXT,
ADD COLUMN     "senderDistrict" TEXT,
ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "senderPhone" TEXT;

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL DEFAULT 'PTT',
    "mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "barcode" TEXT,
    "reference" TEXT NOT NULL,
    "desi" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ETIKET_HAZIR',
    "labelPrintedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_reference_key" ON "Shipment"("reference");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_status_lastCheckedAt_idx" ON "Shipment"("status", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "Shipment_barcode_idx" ON "Shipment"("barcode");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_at_idx" ON "ShipmentEvent"("shipmentId", "at");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Same rule as every other table (init migration): no access through the Supabase data API.
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShipmentEvent" ENABLE ROW LEVEL SECURITY;
