/** Size matching never removes grades or model identifiers. Records remain separate SKUs. */
export function publicProductName(name: string, sku?: string) {
  const [identifier, ...details] = name.split(/\s+[—–]\s+/);
  if (!details.length) return name;
  if (/\b(?:free|bonus|total|offer)\b|\+/i.test(details.join(" "))) return name;
  const vehicle = /\b(?:toyota|honda|nissan|sunny|pajero|mitsub(?:ishi|isi)|mazda|ford|suzuki|isuzu|renault|kwid|tata|leyland|canter|daihatsu|hyundai|kia|bmw|benz|mercedes|corolla|hilux|hiace|lancer|vitz)\b/i;
  const partCode = /^(?!(?:oil|sae|dot)\b)(?:[a-z]{1,4}[\s-]*)?\d[a-z\d\s/()-]*$/i;
  if (!vehicle.test(details.join(" ")) && !partCode.test(identifier!.trim())) return name;
  if (/^(?:renault|toyota|honda|nissan|suzuki|mitsubishi|mazda|ford)$/i.test(identifier!.trim())) return `Automotive accessory${sku ? ` (${sku})` : ""}`;
  return identifier!.trim();
}

export function productFamilyKey(name: string) {
  return name.toLowerCase()
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|litres?|liters?|lt|l|kg|grams?|g)\b/gi, " ")
    .replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim();
}

export function publicSpecifications(specs: Record<string, unknown> | null) {
  return Object.entries(specs ?? {}).filter(([key, value]) =>
    !/(supplier|warehouse|material|internal|source|stock\s*unit|retail\s*price|compatib|suitable\s*for|application|vehicle|machine|image note|combined stock|manufacturer url|pack offer)/i.test(key)
    && (typeof value === "string" || typeof value === "number"));
}

export function offerTitle(name: string, specs: Record<string, unknown> | null) {
  const offer = specs?.["Pack offer"];
  return typeof offer === "string" && offer.trim() ? `${name} — ${offer.trim()}` : name;
}

export function catalogueSections(sourceGroups: Array<string | null>, brand: string | undefined, category: string) {
  const groups = sourceGroups.filter((value): value is string => Boolean(value && /[a-z]/i.test(value) && /oil|fluid|grease|coolant|lubricant/i.test(value)));
  return [...new Set(groups.length ? groups : [`${brand ? `${brand} · ` : ""}${category}`])];
}
