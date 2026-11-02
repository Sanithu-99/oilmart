import { describe, expect, it } from "vitest";

import caltexPriceList from "../../prisma/data/caltex-retail-price-list-2026-10-26.json";
import inventoryProducts from "../../prisma/data/inventory-products.json";
import inventorySource from "../../prisma/data/inventory-report-source-2026-10-14.json";
import { applicationsForInventoryProduct, VEHICLE_APPLICATIONS } from "@/lib/catalog/applications";

describe("document-backed catalogue data", () => {
  it("retains every Caltex row and imports retail prices only", () => {
    expect(caltexPriceList.items).toHaveLength(205);
    expect(new Set(caltexPriceList.items.map((item) => item.applicationGroupNumber)).size).toBe(30);
    expect(caltexPriceList.items.every((item) => item.retailPriceMinor > 0)).toBe(true);
    expect(caltexPriceList.source.retainedPriceColumn).toContain("Gross Retail Price");
    expect(JSON.stringify(caltexPriceList)).not.toMatch(/wholesalePrice|unitCost|totalCost/i);
  });

  it("links only exact current-stock matches from the price revision", () => {
    const inventorySkus = new Set(inventoryProducts.map((item) => item.sku));
    const matched = caltexPriceList.items.flatMap((item) => item.matchedProductSku ? [item.matchedProductSku] : []);
    expect(matched).toHaveLength(55);
    expect(new Set(matched).size).toBe(55);
    expect(matched.every((sku) => inventorySkus.has(sku))).toBe(true);
  });

  it("retains all inventory-report source rows without supplier cost fields", () => {
    expect(inventorySource.items).toHaveLength(326);
    expect(inventorySource.items.filter((item) => item.matchedProductSku)).toHaveLength(321);
    expect(JSON.stringify(inventorySource)).not.toMatch(/unitCost|totalCost|costMinor/i);
  });

  it("provides unique vehicle and application classifications for every stocked product", () => {
    expect(new Set(VEHICLE_APPLICATIONS.map((item) => item.slug)).size).toBe(VEHICLE_APPLICATIONS.length);
    for (const product of inventoryProducts) {
      expect(applicationsForInventoryProduct(product).length, product.name).toBeGreaterThan(0);
    }
  });
});
