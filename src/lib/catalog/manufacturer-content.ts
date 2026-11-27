import { productFamilyKey } from "./product-options";
import { additionalManufacturerSummaries } from "./manufacturer-summaries";

// Original summaries of verified Sri Lankan manufacturer facts, checked 25 Nov 2026.
// Exact product families only: no vehicle fitment or extended-drain claims.
const summaries = [
  { match: /^(?:caltex )?havoline super 4t (?:sae )?20w-?50(?: loose)?$/, url: "https://caltex.lk/product/havoline-super-4t-sae-20w-50/", description: "This Caltex four-stroke oil has a 20W-50 viscosity grade. Its additive system helps limit deposits and oxidation while providing lubrication and wear protection. Select the pack size stocked by the shop; packaging can vary by batch." },
  { match: /^(?:caltex )?havoline super 4t (?:sae )?20w-?40(?: loose)?$/, url: "https://caltex.lk/product/havoline-super-4t-sae-20w-40/", description: "A 20W-40 four-stroke oil from Caltex. The formulation combines base oil and additives to support cleanliness, resist oxidation and maintain lubrication under load. Available sizes and quantities reflect the shop's inventory." },
  { match: /^(?:caltex )?havoline formula (?:sae )?10w-?30(?: loose)?$/, url: "https://caltex.lk/product/havoline-formula-sae-10w-30/", description: "Caltex Havoline Formula in the 10W-30 grade is a multigrade petrol-engine lubricant. The formulation uses detergents, dispersants and friction modifiers to help control deposits and reduce internal friction. Confirm the current label and product specification before purchase." },
  { match: /^(?:caltex )?delo gold ultra (?:sae )?15w-?40(?: loose)?$/, url: "https://caltex.lk/product/caltex-delo-gold-ultra/", description: "Delo Gold Ultra 15W-40 is a Caltex lubricant made with ISOSYN base-oil technology and an additive package that helps disperse soot and limit wear and corrosion. Pack sizes are listed separately so the ordered quantity matches the shop's stock." },
  { match: /^(?:caltex )?havoline super 2t(?: loose)?$/, url: "https://caltex.lk/product/havoline-super-2t/", description: "This Caltex two-stroke lubricant uses a low-ash additive system. Its formulation helps limit carbon accumulation around pistons, exhaust ports and spark plugs while providing lubrication. The manufacturer lists JASO FC and ISO EGC performance levels." },
];

export function manufacturerContent(brand: string | undefined, name: string) {
  if (!brand) return null;
  const key = productFamilyKey(name);
  const original = brand.toLowerCase() === "caltex" ? summaries.find((entry) => entry.match.test(key)) : null;
  if (original) return { ...original, sourceRegion: "Sri Lanka" as const, checkedAt: "2026-11-25" };
  const normalized = manufacturerFamilyKey(brand, name);
  return additionalManufacturerSummaries.find((entry) => entry.brand.toLowerCase() === brand.toLowerCase() && entry.aliases.some((alias) => manufacturerFamilyKey(brand, alias) === normalized)) ?? null;
}

/** Remove documented pack notation only; grades, formulations and model codes stay intact. */
export function manufacturerFamilyKey(brand: string, name: string) {
  let key = productFamilyKey(name).replace(/(\d+)w-?(\d+)/g, "$1w$2").replace(/\bsae\s*/g, "");
  const prefix = `${brand.toLowerCase()} `;
  if (key.startsWith(prefix)) key = key.slice(prefix.length);
  return key.replace(/[\/–—-]/g, " ").replace(/\bdot\s*(\d)/g, "dot$1").replace(/\s+/g, " ").trim().replace(/(?:\s+(?:loose|tin|pack|prom))+$/, "");
}

export function withoutCompatibilityCopy(text: string | null) {
  if (text == null) return null;
  return text
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .filter((sentence) => !/\b(?:fits?|compatible with|suitable for|recommended for(?: use in)?)\b/i.test(sentence))
    .map((sentence) => sentence.replace(/,?\s*(?:and\s+)?(?:vehicle|machine) compatibility/gi, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
