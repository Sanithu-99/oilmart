// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { officialImageSkus, officialProductImage } from "@/lib/catalog/official-images";

describe("exact manufacturer photo selection", () => {
  it("uses distinct grade and pack photos rather than a shared Mobil family thumbnail",()=>{
    const oneLitre=officialProductImage("INV-518788F630")!;
    const fourLitres=officialProductImage("INV-6D4FAAF535")!;
    const otherGrade=officialProductImage("INV-58113F0048")!;
    expect(oneLitre.url).toContain("10w40-1l");
    expect(fourLitres.url).toContain("10w40-4l");
    expect(otherGrade.url).toContain("10w30-4l");
    expect(new Set([oneLitre.url,fourLitres.url,otherGrade.url]).size).toBe(3);
    expect(officialProductImage("INV-21CAF07E53")?.alt).toContain("6 litre");
  });
  it("does not pretend native campaign crops or PDF packshots are high resolution",()=>{
    expect(officialProductImage("INV-21CAF07E53")?.highResolution).toBe(false);
    expect(officialProductImage("INV-61377B8291")?.highResolution).toBe(false);
    expect(officialProductImage("INV-E8B337ACEF")?.highResolution).toBe(true);
  });
  it("does not reuse a photo for an unknown SKU, model or a prototype property", () => {
    for (const sku of ["INV-9F0F6C436C-4L", "eurol-atf-7400-4l", "INV-UNKNOWN", "__proto__", "constructor"]) expect(officialProductImage(sku)).toBeNull();
    expect(officialProductImage("INV-9F0F6C436C")?.alt).toContain("1 litre");
    expect(officialProductImage("INV-CFEB8E446C")?.alt).toContain("single 32 ml");
  });
  it("has real decodable local image assets at the recorded dimensions", async () => {
    for (const sku of officialImageSkus) {
      const image = officialProductImage(sku)!;
      const bytes = await readFile(path.join(process.cwd(), "public", image.url));
      const metadata = await sharp(bytes).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(image.width); expect(metadata.height).toBe(image.height);
    }
  });
  it("reports a small original honestly instead of calling it a high-resolution replacement", () => {
    const prestone = officialProductImage("INV-5291F165C2")!;
    expect(prestone.highResolution).toBe(false); expect(prestone.width).toBe(300); expect(prestone.height).toBe(493);
  });
});
