/** Exact accessory pack images from official manufacturer pages/documents.
 * Do not replace owner uploads. `replaces` lists only the known imported thumbnail.
 */
export type AccessoryImageUpgrade = { url: string; alt: string; width: number; height: number; sourceUrl: string; highResolution: boolean; replaces: readonly string[] };

const images: Record<string, AccessoryImageUpgrade> = {
  "INV-1FD3ED97E0": {
    url: "/images/products/verified-2026-11-27/accessory-wurth-interior-cleaner-500ml.webp",
    alt: "Würth Interior Cleaner 500 ml — official manufacturer pack photograph",
    width: 1000, height: 1000, highResolution: true,
    sourceUrl: "https://eshop.wurth.rs/aktivna-pena-za-ciscenje-sprej",
    replaces: ["/images/products/inventory/wurth-interior-cleaner.webp"],
  },
  "INV-61377B8291": {
    url: "/images/products/verified-2026-11-27/accessory-abro-radiator-flush-354ml.webp",
    alt: "ABRO AB-505 Radiator 10 Minute Flush, 354 ml — manufacturer product photograph",
    width: 269, height: 581, highResolution: false,
    sourceUrl: "https://abro.com/wp-content/uploads/2022/10/AB-505-Radiator-Flush-Sellsheet-2022.pdf",
    replaces: [],
  },
};

export function accessoryImageUpgrade(sku: string): AccessoryImageUpgrade | null {
  return Object.hasOwn(images, sku) ? images[sku]! : null;
}

export const accessoryImageUpgradeSkus = Object.keys(images);
