-- Keep the imported source/material record intact while publishing customer-facing copy.
UPDATE "Product"
SET
  "shortDescription" = 'Heavy-duty hydraulic shock absorber fluid · 500 ml',
  "description" = 'Purpose-formulated hydraulic fluid for motorcycle front forks, hydraulic shock units and twin-tube dampers. Designed to support consistent damping with anti-foaming performance, seal conditioning and thermal stability.',
  "technicalSpecs" = '{"Fluid Type":"Heavy-duty hydraulic shock absorber fluid","Volume":"500 ml","Suitable For":"Motorcycle front forks, hydraulic shock units, twin-tube dampers","Key Benefits":"Anti-foaming, seal-conditioning, thermal stability"}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "sku" = 'INV-B3067D6C70';

-- Official front pack shot from the Caltex Sri Lanka product page. Owner-shot
-- back-label, seal and side views can be appended through the multi-photo editor.
INSERT INTO "ProductImage" (
  "id",
  "productId",
  "storageKey",
  "url",
  "altText",
  "width",
  "height",
  "sortOrder",
  "primary",
  "createdAt"
)
SELECT
  'img_caltex_shock_absorber_h_official',
  product."id",
  'inventory-primary',
  '/images/products/inventory/caltex-shock-absorber-oil-h.png',
  'Caltex Lanka Shock Absorber Oil H 500 ml front bottle',
  250,
  350,
  COALESCE((SELECT MAX(existing."sortOrder") + 1 FROM "ProductImage" existing WHERE existing."productId" = product."id"), 0),
  NOT EXISTS (SELECT 1 FROM "ProductImage" existing WHERE existing."productId" = product."id" AND existing."primary" = true),
  CURRENT_TIMESTAMP
FROM "Product" product
WHERE product."sku" = 'INV-B3067D6C70'
ON CONFLICT ("productId", "storageKey") DO UPDATE SET
  "url" = EXCLUDED."url",
  "altText" = EXCLUDED."altText",
  "width" = EXCLUDED."width",
  "height" = EXCLUDED."height";
