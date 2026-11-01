import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputPath = path.resolve(process.argv[2] ?? "/tmp/oilmart-inventory-raw.json");
const outputPath = path.resolve("prisma/data/inventory-products.json");

const rawRows = JSON.parse(await readFile(inputPath, "utf8"));

const internalOnly = /^(empty bottle 1lt|empty can|empty drum|bottle lid)$/i;

function baseItem(value) {
  return value.split("--")[0].trim();
}

function keyFor(value) {
  return baseItem(value)
    .toLowerCase()
    .replace(/\((\d+)\s*x\s*(\d+)\s*l(?:p)?\)/g, "$2l")
    .replace(/(\d+(?:\.\d+)?)\s*(?:lt|ltr)\b/g, "$1l")
    .replace(/(\d+(?:\.\d+)?)\s*ml\b/g, "$1ml")
    .replace(/\s+/g, " ")
    .trim();
}

function publicName(row) {
  const keepFitment = /filter/i.test(row.reportCategory)
    || row.reportCategory === "Mitsubishi"
    || (row.reportCategory === "OTHER BRAND" && /--/.test(row.item) && !/\d{3,}/.test(row.item.split("--")[1] ?? ""));
  let value = keepFitment ? row.item.replace("--", "—") : baseItem(row.item);
  value = value
    .replace(/^CX\s+/i, "Caltex ")
    .replace(/^Cx\s+/i, "Caltex ")
    .replace(/^Caltex Hav\s+/i, "Caltex Havoline ")
    .replace(/^Caltex LK\s+/i, "Caltex Lanka ")
    .replace(/^Hav\s+/i, "Caltex Havoline ")
    .replace(/^LK\s+/i, "Caltex Lanka ")
    .replace(/^Lk\s+/i, "Caltex Lanka ")
    .replace(/^Super Plus\s+/i, "Caltex Lanka Super Plus ")
    .replace(/^Mob\s+/i, "Mobil ")
    .replace(/^Mobile\s+/i, "Mobil ")
    .replace(/^LF\s+/i, "Laugfs ")
    .replace(/^AB\s+Chain/i, "ABRO Chain")
    .replace(/^Petromine\b/i, "Petromin")
    .replace(/^Front Poke Oil\b/i, "Front Fork Oil")
    .replace(/AntFre/gi, "Antifreeze")
    .replace(/Coolent/gi, "Coolant")
    .replace(/\bFld\b/gi, "Fluid")
    .replace(/Freshner/gi, "Freshener")
    .replace(/Frshner/gi, "Freshener")
    .replace(/Dashbord/gi, "Dashboard")
    .replace(/Greese|Greae/gi, "Grease")
    .replace(/Abosrber/gi, "Absorber")
    .replace(/Synthatic/gi, "Synthetic")
    .replace(/Vechicle/gi, "Vehicle")
    .replace(/Papaer/gi, "Paper")
    .replace(/\bTyer\b/gi, "Tyre")
    .replace(/Carburator/gi, "Carburettor")
    .replace(/\b1Lt1\b/gi, "1 L")
    .replace(/\((\d+)\s*x\s*(\d+)\s*L(?:P)?\)/gi, "$2 L")
    .replace(/(\d+(?:\.\d+)?)\s*(?:Lt|LTR)\b/gi, "$1 L")
    .replace(/(\d+(?:\.\d+)?)\s*ml\b/gi, "$1 ml")
    .replace(/\s+/g, " ")
    .trim();
  return value;
}

function brandFor(row, name) {
  if (/^(0[1-6]|10|11|12|15|21|24|25|26|28|29)$/.test(row.reportCategory) || /^Caltex\b/.test(name)) return "Caltex";
  const map = {
    "Sakura Filters": "Sakura",
    "VIC Filters": "VIC",
    "Oil Filter": "Fuji",
    "Fuji Coolant": "Fuji",
    "OTHER BRAND": null,
    Accessories: null,
    Parts: null,
    Battery: null,
    Other: null,
  };
  if (Object.hasOwn(map, row.reportCategory)) return map[row.reportCategory];
  return row.reportCategory
    .replace(/^WURTH$/, "Wurth")
    .replace(/^TOTACHI$/, "Totachi")
    .replace(/^SINOPEC$/, "Sinopec")
    .replace(/^ABRO$/, "ABRO");
}

function isLooseOil(name) {
  return /\bloose\b/i.test(name)
    && !/(freshener|shine|grease|coolant|cloth|wash|teepol)/i.test(name);
}

function categoryFor(row, name) {
  const value = `${row.reportCategory} ${name}`.toLowerCase();
  if (row.reportCategory === "Mitsubishi" || /filter|\b(?:a|c|fc|o|sfc|san)-?\s?\d{2,}/i.test(value) || /toyota 0(?:4|9)\d{3}/i.test(value)) return "filters";
  if (/air fresh|carwash|car wash|polish|dashboard|leather shine|microfiber|cham cloth|surface shine|tyre shine|windscreen|interior cleaner|teepol|strawberry|english rose/.test(value)) return "car-care";
  if (/battery (?:acid|water)/.test(value)) return "battery-care";
  if (/brake|dot\s?[345]/.test(value)) return "brake-fluids";
  if (/coolant|antifreeze|havoline xli|prestone asian vehicles|suzuki green/.test(value)) return "coolants";
  if (/injector|motor flush|octane|smoke stop|radiator flush|leak repair|eco (?:diesel|petrol)|carburettor/.test(value)) return "additives-cleaners";
  if (/grease|marfak|starplex|rando|compressor oil|chain lube|handy multi|power oil/.test(value)) return "greases-lubricants";
  if (/shock absorber|front fork oil/.test(value)) return "suspension-fluids";
  if (isLooseOil(name)) return "loose-oils";
  if (/\b(?:atf|cvtf|cvt|texamatic|dexron|dw-1|trans plus|velomatic)\b/.test(value)) return "transmission-fluids";
  if (/\bgear\b|\bmtf|\b75w\b/.test(value)) return "gear-oils";
  if (/4t|2t|motorcycle|motor cycle|outboard|xplore|supermatic/.test(value)) return "motorcycle-oils";
  if (/delo gold|all fleet|delvac|super ds|d40|power d|ci-?4|torqforce/.test(value)) return "diesel-engine-oils";
  if (/\b(?:\d{1,2}w[- ]?\d{2}|sae\s?\d{2,3}|engine oil|gtx|magnatec|edge|havoline formula|mobil super|fine gasoline|j500|syn power|vr1|silk 8000|ry bolt|super 3000|super plus (?:30|40))\b/.test(value)) return "engine-oils";
  return "automotive-accessories";
}

function retailPriceMinor(item) {
  const suffix = item.split("--")[1]?.trim() ?? "";
  const match = suffix.match(/^New Price\s*([\d,]+)/i) ?? suffix.match(/^([\d,]{3,})(?:\s|$|=)/);
  if (!match) return 0;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function imageFor(name, brand, category) {
  const value = name.toLowerCase();
  const root = "/images/products/inventory/";
  if (brand === "Caltex") {
    if (/delo gear|delo mtf/.test(value)) return `${root}caltex-delo-gear-ep5.webp`;
    if (/delo gold/.test(value)) return `${root}caltex-delo-gold-ultra.webp`;
    if (/havoline formula/.test(value)) return `${root}caltex-havoline-formula-10w30.webp`;
    if (/supermatic/.test(value)) return `${root}caltex-supermatic-10w30.webp`;
    if (/super 4t/.test(value)) return `${root}caltex-havoline-super-4t.webp`;
    if (/super 2t/.test(value)) return `${root}caltex-havoline-super-2t.webp`;
    if (/outboard/.test(value)) return `${root}caltex-super-outboard.webp`;
    if (/texamatic/.test(value)) return `${root}caltex-texamatic-1888.webp`;
    if (/brake/.test(value)) return `${root}caltex-brake-fluid-dot3.webp`;
    if (/cvt/.test(value)) return `${root}caltex-havoline-cvt.webp`;
    if (/multi atf/.test(value)) return `${root}caltex-havoline-atf.webp`;
    if (/prods.*0w16/.test(value)) return `${root}caltex-prods-0w16.webp`;
    if (/prods.*0w20/.test(value)) return `${root}caltex-prods-0w20.webp`;
    if (/prods.*5w30/.test(value)) return `${root}caltex-prods-5w30.webp`;
    if (/xli.*red/.test(value)) return `${root}caltex-xli-red.webp`;
    if (/xli/.test(value)) return `${root}caltex-xli-green.webp`;
    if (/super ds.*15w40/.test(value)) return `${root}caltex-lanka-super-ds-15w40.webp`;
    if (/super ds/.test(value)) return `${root}caltex-lanka-super-ds-20w50.webp`;
    if (/gear mp 140/.test(value)) return `${root}caltex-lanka-gear-mp140.webp`;
    if (/gear mp 90/.test(value)) return `${root}caltex-lanka-gear-mp90.webp`;
    if (/marfak.*ep3/.test(value)) return `${root}caltex-marfak-ep3.webp`;
    if (/marfak/.test(value)) return `${root}caltex-marfak-ep2.webp`;
    if (/starplex/.test(value)) return `${root}caltex-starplex.webp`;
    if (/rando/.test(value)) return `${root}caltex-rando.webp`;
    if (/compressor/.test(value)) return `${root}caltex-compressor-oil.webp`;
    if (/torqforce/.test(value)) return `${root}caltex-torqforce-30.webp`;
    if (/super plus 30/.test(value)) return `${root}caltex-super-plus-30.webp`;
    if (/super plus 40/.test(value)) return `${root}caltex-super-plus-40.webp`;
  }
  if (brand === "Castrol") {
    if (/edge/.test(value)) return `${root}castrol-edge-5w30.webp`;
    if (/magnatec/.test(value)) return `${root}castrol-magnatec-5w30.webp`;
    if (/gtx/.test(value)) return `${root}castrol-gtx-20w50.webp`;
  }
  if (brand === "Mobil") {
    if (/delvac/.test(value)) return `${root}mobil-delvac-mx.webp`;
    if (/mobil 1|esp/.test(value)) return `${root}mobil-1-esp-5w30.webp`;
    if (/super|3000/.test(value)) return `${root}mobil-super-10w30.webp`;
  }
  if (brand === "Toyota" && /10w30/.test(value)) return `${root}toyota-10w30-sp.webp`;
  if (brand === "Valvoline" && /maxlife/.test(value)) return `${root}valvoline-maxlife-atf.webp`;
  if (brand === "Valvoline" && /(syn power|0w20)/.test(value)) return `${root}valvoline-synpower-0w20.webp`;
  if (brand === "Sakura") return `${root}sakura-filter.webp`;
  if (brand === "VIC") return `${root}vic-filter.webp`;
  if (brand === "Prestone" && category === "coolants") return `${root}prestone-coolant.webp`;
  if (brand === "Wurth" && /interior cleaner/.test(value)) return `${root}wurth-interior-cleaner.webp`;
  if (brand === "ABRO" && /chain lube/.test(value)) return `${root}abro-chain-lube.webp`;
  if ((brand === "Delphi" || brand === "Fuji") && /lockheed|brake fluid|brake oil/.test(value)) return `${root}delphi-lockheed-dot3.webp`;
  if (brand === "Laugfs" && /revtron/.test(value)) return `${root}laugfs-revtron-4t.webp`;
  if (brand === "Totachi" && /fine gasoline/.test(value)) return `${root}totachi-fine-gasoline.webp`;
  if (brand === "Petromin" && /a-?1 plus/.test(value)) return `${root}petromin-a1-plus.webp`;
  if (brand === "Sinopec" && /j500/.test(value)) return `${root}sinopec-j500.webp`;
  if (brand === "Honda" && /dw-?1/.test(value)) return `${root}honda-dw1.webp`;
  if (brand === "Royal Super" && /(?:ry bolt|ultra 15w40)/.test(value)) return `${root}royal-super-10w30.webp`;
  return null;
}

function unitOfSale(row, category) {
  if (category === "loose-oils" || row.unit === "Lt") return "LITRE";
  if (row.unit === "ml") return "MILLILITRE";
  if (/pack/i.test(row.unit)) return "PACK";
  if (/drum/i.test(row.unit)) return "DRUM";
  if (/can|botl|tin/i.test(row.unit)) return "BOTTLE";
  if (/pcs|unit/i.test(row.unit)) return "UNIT";
  return "OTHER";
}

const grouped = new Map();
for (const row of rawRows) {
  if (row.quantity <= 0 || internalOnly.test(row.item.trim())) continue;
  const key = keyFor(row.item);
  const current = grouped.get(key);
  if (current) {
    current.quantity += row.quantity;
    current.priceMinor ||= retailPriceMinor(row.item);
    current.sourceRows += 1;
  } else {
    grouped.set(key, { ...row, quantity: row.quantity, priceMinor: retailPriceMinor(row.item), sourceRows: 1 });
  }
}

const featuredPatterns = /delo gold ultra|prods eco5.*(?:0w20|5w30).*4 l|havoline super 4t 20w40|castrol edge|mobil super 10w30 4 l|toyota 10w30 sp 4 l|valvoline maxlife atf 4 l|sinopec j500|laugfs revtron/i;

const products = [...grouped.entries()].map(([key, row]) => {
  const name = publicName(row);
  const brand = brandFor(row, name);
  const category = categoryFor(row, name);
  const digest = createHash("sha1").update(key).digest("hex").slice(0, 10);
  const volume = name.match(/\b\d+(?:\.\d+)?\s?(?:L|ml|g|kg)\b/i)?.[0] ?? null;
  const grade = name.match(/\b\d{1,2}W[- ]?\d{1,2}\b/i)?.[0]?.replace("-", "") ?? name.match(/\bSAE\s?\d{2,3}\b/i)?.[0] ?? null;
  const image = imageFor(name, brand, category);
  const specifications = {
    ...(grade ? { Grade: grade } : {}),
    ...(volume ? { Pack: volume } : {}),
    "Stock unit": row.unit,
    ...(row.sourceRows > 1 ? { "Combined stock rows": row.sourceRows } : {}),
    ...(image ? { "Image note": "Product or brand-family pack image; packaging may vary." } : {}),
  };
  const categoryLabel = {
    "engine-oils": "Engine oil",
    "diesel-engine-oils": "Diesel engine oil",
    "motorcycle-oils": "Motorcycle oil",
    "transmission-fluids": "Transmission fluid",
    "gear-oils": "Gear oil",
    coolants: "Coolant",
    "brake-fluids": "Brake fluid",
    "greases-lubricants": "Grease and lubricant",
    filters: "Automotive filter",
    "additives-cleaners": "Automotive additive and cleaner",
    "car-care": "Car care product",
    "battery-care": "Battery care product",
    "loose-oils": "Loose oil",
    "suspension-fluids": "Suspension fluid",
    "automotive-accessories": "Automotive accessory",
  }[category];
  return {
    sku: `INV-${digest.toUpperCase()}`,
    slug: `${slugify(name)}-${digest.slice(0, 6)}`,
    name,
    brand,
    category,
    shortDescription: `${categoryLabel}${volume ? ` · ${volume}` : ""}`,
    description: "Available from Saranankara Oil Mart. Please confirm the current price, packaging and vehicle compatibility before purchase.",
    specifications,
    priceMinor: row.priceMinor,
    quantity: Number(row.quantity.toFixed(4)).toString(),
    unitOfSale: unitOfSale(row, category),
    type: category === "loose-oils" ? "LOOSE_OIL" : "STANDARD",
    image,
    featured: Boolean(image && featuredPatterns.test(name)),
  };
}).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`);

const summary = products.reduce((result, item) => {
  result[item.category] = (result[item.category] ?? 0) + 1;
  return result;
}, {});
console.log(JSON.stringify({ rawRows: rawRows.length, importedProducts: products.length, withImages: products.filter((item) => item.image).length, withRetailPrices: products.filter((item) => item.priceMinor > 0).length, categories: summary }, null, 2));
