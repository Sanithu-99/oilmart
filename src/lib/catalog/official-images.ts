/** Exact inventory SKU mappings, checked against public manufacturer product pages.
 * Owner-uploaded product images take precedence. Never reuse for another pack or grade.
 */
const images: Record<string, { url: string; alt: string; width: number; height: number; sourceUrl: string; highResolution: boolean }> = {
  "INV-9F0F6C436C": { url: "/images/verified-manufacturers/eurol-atf-7400-1l.webp", alt: "Eurol ATF 7400 automatic transmission oil, 1 litre", width: 640, height: 1200, sourceUrl: "https://www.eurol.com/en/shop/products/E113647-eurol-atf-7400/1147", highResolution: true },
  "INV-CFEB8E446C": { url: "/images/verified-manufacturers/wurth-windscreen-32ml.webp", alt: "Würth rapid windscreen wash concentrate, single 32 ml bottle", width: 800, height: 800, sourceUrl: "https://eshop.wuerth.de/Rapid-windscreen-cleaner-in-display-carton-CLNR-WSCRN-SUM-RAPID-32ML/0892333.sku/en/US/EUR/", highResolution: true },
  "INV-F0A0154BA3": { url: "/images/verified-manufacturers/wurth-pvc-tape-19mm-10m.webp", alt: "Würth black PVC insulating tape, 19 mm by 10 metres", width: 800, height: 800, sourceUrl: "https://www.wurth.es/cinta-aislante-pvc-19mm-x-10m-negra", highResolution: true },
  "INV-5291F165C2": { url: "/images/verified-manufacturers/prestone-atf-stop-leak-946ml.webp", alt: "Prestone automatic transmission fluid plus stop leak, 946 ml", width: 300, height: 493, sourceUrl: "https://prestone.com.ph/prestone-automatic-transmission-fluid-stop-leak/", highResolution: false },
};

export function officialProductImage(sku: string) {
  return Object.hasOwn(images, sku) ? images[sku]! : null;
}

export const officialImageSkus = Object.keys(images);
