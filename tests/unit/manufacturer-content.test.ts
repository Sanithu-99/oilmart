import { describe, expect, it } from "vitest";
import { manufacturerContent, manufacturerFamilyKey, withoutCompatibilityCopy } from "@/lib/catalog/manufacturer-content";
import { additionalManufacturerSummaries } from "@/lib/catalog/manufacturer-summaries";
import { manufacturerImage } from "@/lib/catalog/manufacturer-images";

describe("manufacturer-based original content", () => {
  it.each([
    ["Caltex", "Caltex Texamatic 1888 (250 ml)", "texamatic-1888"],
    ["Caltex", "Caltex Marfak Multi EP2 (200g) Tin", "multipurpose-ep-2"],
    ["Caltex", "Caltex Brake/Clutch Fluid DOT4- 500 ml", "dot-4"],
    ["Caltex", "Caltex Lanka Super DS15W40 (6 L) Prom", "15w-40"],
    ["Caltex", "Caltex Havoline ProDS ECO5 SAE 0W16 (1 L)", "eco-0w16"],
    ["Mobil", "Mobil Delvac MX 15W40 7.5 L", "mobil-delvac-mx-15w-40"],
    ["Valvoline", "Valvoline Maxlife ATF 4 L", "maxlife-atf"],
    ["ABRO", "ABRO Chain Lube 113g", "chain-lube"],
  ])("matches exact inventory family %s %s", (brand, name, expected) => {
    expect(manufacturerContent(brand, name)?.url).toContain(expected);
  });
  it.each([
    ["Caltex", "Caltex Havoline Super 4T 10W40 1 L"],
    ["Caltex", "Caltex Rando 32 (20 L)"],
    ["Caltex", "Caltex Havoline XLI Green Mixed (1 L)"],
    ["Caltex", "Caltex Delo Gear EP5 85W140 1 L"],
    ["Mobil", "Mobil Delvac Legend Heavy Duty 1 L"],
    ["Other", "Caltex Texamatic 1888 1 L"],
    ["ABRO", "Wrco Chain Lube 113g"],
    ["Totachi", "Fine Gasoline 15W40 SP 1 L"],
  ])("does not guess unknown formulation %s %s", (brand, name) => {
    expect(manufacturerContent(brand, name)).toBeNull();
  });
  it("retains distinguishing grades and documents the regional source", () => {
    expect(manufacturerFamilyKey("Caltex", "Lanka Gear MP 90 1 L")).not.toBe(manufacturerFamilyKey("Caltex", "Lanka Gear MP 140 1 L"));
    expect(manufacturerContent("Mobil", "Mobil Delvac MX 15W40 1 L")?.sourceRegion).toBe("Asia");
  });
  it("has source and review metadata, with no invented free-pack or fitment claims", () => {
    for (const entry of additionalManufacturerSummaries) {
      expect(new URL(entry.url).protocol).toBe("https:");
      expect(entry.checkedAt).toBe("2026-11-26");
      expect(entry.description).not.toMatch(/\bfree litre\b|fits all|guaranteed|extended drain/i);
    }
  });
  it("only supplies a verified image for the exact brand, family and pack", () => {
    expect(manufacturerImage("ABRO", "Motor Flush 443 ml")?.url).toContain("mf-390-443ml");
    expect(manufacturerImage("ABRO", "Motor Flush 354 ml")).toBeNull();
    expect(manufacturerImage("ABRO", "Wrco Chain Lube 113g")).toBeNull();
    expect(manufacturerImage("Other", "Motor Flush 443 ml")).toBeNull();
  });
  it("removes legacy fitment sentences without removing product facts", () => {
    expect(withoutCompatibilityCopy("A 10W-30 lubricant. Suitable for Toyota models. Check the pack label.")).toBe("A 10W-30 lubricant. Check the pack label.");
    expect(withoutCompatibilityCopy("Fits all machines. Contains anti-wear additives.")).toBe("Contains anti-wear additives.");
    expect(withoutCompatibilityCopy("Please confirm price, packaging and vehicle compatibility before purchase.")).toBe("Please confirm price, packaging before purchase.");
    expect(withoutCompatibilityCopy(null)).toBeNull();
  });
});
