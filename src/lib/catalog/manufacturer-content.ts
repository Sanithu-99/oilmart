import { productFamilyKey } from "./product-options";

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
  if (brand?.toLowerCase() !== "caltex") return null;
  const key = productFamilyKey(name);
  return summaries.find((entry) => entry.match.test(key)) ?? null;
}

export function withoutCompatibilityCopy(text: string | null) {
  return text?.replace(/,?\s*(?:and\s+)?vehicle compatibility/gi, "") ?? null;
}
