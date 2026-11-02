-- Add customer-facing vehicle/application classifications to stocked products.
ALTER TABLE "Product"
ADD COLUMN "vehicleApplications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve the supplied documents as read-only, auditable source catalogues.
-- Deliberately no wholesale or unit-cost values are stored: retail is the only price policy.
CREATE TABLE "CatalogueSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "pageCount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "pricesIncludeVat" BOOLEAN,
    "retainedPriceColumn" TEXT,
    "excludedColumns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogueSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceCatalogueItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "materialCode" TEXT,
    "name" TEXT NOT NULL,
    "specification" TEXT,
    "packSize" TEXT,
    "retailPriceMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "quantity" DECIMAL(18,3),
    "unit" TEXT,
    "sourceCategory" TEXT,
    "applicationSlug" TEXT,
    "sourcePage" INTEGER,
    "sourceRow" INTEGER,
    "matchedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SourceCatalogueItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogueSource_key_key" ON "CatalogueSource"("key");
CREATE INDEX "CatalogueSource_effectiveDate_idx" ON "CatalogueSource"("effectiveDate");
CREATE UNIQUE INDEX "SourceCatalogueItem_sourceId_sourceKey_key" ON "SourceCatalogueItem"("sourceId", "sourceKey");
CREATE INDEX "SourceCatalogueItem_sourceId_sourceCategory_idx" ON "SourceCatalogueItem"("sourceId", "sourceCategory");
CREATE INDEX "SourceCatalogueItem_applicationSlug_idx" ON "SourceCatalogueItem"("applicationSlug");
CREATE INDEX "SourceCatalogueItem_matchedProductId_idx" ON "SourceCatalogueItem"("matchedProductId");
CREATE INDEX "SourceCatalogueItem_materialCode_idx" ON "SourceCatalogueItem"("materialCode");

ALTER TABLE "SourceCatalogueItem"
ADD CONSTRAINT "SourceCatalogueItem_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "CatalogueSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SourceCatalogueItem"
ADD CONSTRAINT "SourceCatalogueItem_matchedProductId_fkey"
FOREIGN KEY ("matchedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
