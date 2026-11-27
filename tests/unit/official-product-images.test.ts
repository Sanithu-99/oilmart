// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { officialImageSkus, officialProductImage } from "@/lib/catalog/official-images";

describe("exact manufacturer photo selection", () => {
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
