import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const outputDirectory = path.resolve("public/images/products/inventory");

const sources = [
  { file: "caltex-delo-gear-ep5", page: "https://caltex.lk/product/caltex-delo-gear-ep5-sae-80w-90/" },
  { file: "caltex-delo-gold-ultra", page: "https://caltex.lk/product/caltex-delo-gold-ultra/" },
  { file: "caltex-havoline-formula-10w30", page: "https://caltex.lk/product/havoline-formula-sae-10w-30/" },
  { file: "caltex-havoline-super-4t", page: "https://caltex.lk/product/havoline-super-4t-sae-20w-40/" },
  { file: "caltex-havoline-super-2t", page: "https://caltex.lk/product/havoline-super-2t/" },
  { file: "caltex-texamatic-1888", page: "https://caltex.lk/product/texamatic-1888/" },
  { file: "caltex-brake-fluid-dot3", page: "https://caltex.lk/product/caltex-brake-and-clutch-fluid-dot-3/" },
  { file: "caltex-havoline-cvt", page: "https://caltex.lk/product/havoline-full-synthetic-cvt-fluid/" },
  { file: "caltex-havoline-atf", page: "https://caltex.lk/product/havoline-full-synthetic-multi-vehicle-atf/" },
  { file: "caltex-lanka-super-ds-15w40", page: "https://caltex.lk/product/lanka-super-ds-sae-15w-40/" },
  { file: "caltex-lanka-super-ds-20w50", page: "https://caltex.lk/product/lanka-super-ds-sae-20w-50/" },
  { file: "caltex-lanka-gear-mp90", page: "https://caltex.lk/product/lanka-gear-mp-90/" },
  { file: "caltex-lanka-gear-mp140", page: "https://caltex.lk/product/lanka-gear-mp-140/" },
  { file: "caltex-marfak-ep2", page: "https://caltex.lk/product/caltex-marfak-multipurpose-ep-2/" },
  { file: "caltex-marfak-ep3", page: "https://caltex.lk/product/caltex-marfak-multipurpose-ep-3/" },
  { file: "caltex-super-plus-30", page: "https://caltex.lk/product/lanka-super-plus-sae-30/" },
  { file: "caltex-super-plus-40", page: "https://caltex.lk/product/lanka-super-plus-sae-40/" },
  { file: "caltex-supermatic-10w30", page: "https://caltex.lk/product/havoline-supermatic-4t-semi-synthetic-sae-10w-30/" },
  { file: "caltex-torqforce-30", page: "https://caltex.lk/product/lanka-torqforce-sae-30/" },
  { file: "caltex-super-outboard", page: "https://caltex.lk/product/havoline-super-outboard-3-tcw3/" },
  { file: "caltex-rando", page: "https://caltex.lk/product/rando-hd-68/" },
  { file: "caltex-xli-green", page: "https://caltex.lk/product/havoline-xtended-life-inhibitor/" },
  { file: "caltex-xli-red", page: "https://caltex.lk/product/havoline-xtended-life-inhibitor-red/" },
  { file: "caltex-starplex", page: "https://caltex.lk/product/caltex-delo-starplex-ep-2/" },
  { file: "caltex-prods-0w20", page: "https://caltex.lk/product/havoline-prods-fully-synthetic-eco-5-sae-0w-20/" },
  { file: "caltex-prods-5w30", page: "https://caltex.lk/product/havoline-prods-fully-synthetic-eco-5-sae-5w-30/" },
  { file: "caltex-prods-0w16", page: "https://caltex.lk/product/havoline-prods-fully-synthetic-eco-0w16/" },
  { file: "caltex-compressor-oil", page: "https://caltex.lk/product/compressor-oil-ep-vdl-68/" },
  { file: "mobil-super-10w30", direct: "https://oil.lk/wp-content/uploads/2024/02/mobil-10-30-4L.jpg", source: "https://oil.lk/product/mobil-10w30-4l/" },
  { file: "mobil-delvac-mx", direct: "https://media.takealot.com/covers_images/6b5ffe716410439e8559a358b4a6f1c7/s-zoom.file", source: "https://www.takealot.com/" },
  { file: "mobil-1-esp-5w30", direct: "https://motornaolja24.com/image/cache/catalog/mobil/Mobil%201%20ESP%205W30%201L-768x768.png", source: "https://motornaolja24.com/" },
  { file: "castrol-gtx-20w50", direct: "https://www.turkoilmarket.com/shop/ur/92/myassets/products/062/castrol3413901-1-copy.jpg?revision=1767857982", source: "https://www.turkoilmarket.com/" },
  { file: "castrol-magnatec-5w30", direct: "https://digitalcontent.api.tesco.com/v2/media/ghs/c503022d-38ea-4aa3-baf0-b073e9cf3368/9f635ac5-b739-4140-a942-1ba9c4d390f9_47243492.jpeg", source: "https://www.tesco.com/" },
  { file: "castrol-edge-5w30", direct: "https://www.mein-motoroelshop.de/media/image/magnalister/products/1500px/15F617_4008177184062_Castrol-Edge-Professional-Longlife-3-5W-30-4-Liter_AopPfki0Giv4Cm.jpg", source: "https://www.mein-motoroelshop.de/" },
  { file: "royal-super-10w30", direct: "https://royalsuper.ae/wp-content/uploads/10W30-SP-1L-JUL24.webp", source: "https://royalsuper.ae/lubricants-products/royal-super-gasoline-engine-oil-10w-30-api-sp-1-liter/" },
  { file: "toyota-10w30-sp", direct: "https://admin.oilmart.lk/pos/v1/products/image/product_9c13c3af-0739-4e90-bd07-4e3449e133cb.jpg", source: "https://www.oilmart.lk/" },
  { file: "valvoline-maxlife-atf", direct: "https://www.valvolineglobal.com/4ac550/globalassets/sitecore/australiaregion/images/products/transmission20and20driveline/11290420maxlife20atf204l.png", source: "https://www.valvolineglobal.com/" },
  { file: "valvoline-synpower-0w20", direct: "https://www.valvolineglobal.com/4ad5be/globalassets/sitecore/thailandregion/images/products/omega%20cat%20hero%20img/pcmo%20thumb/pcmo_product%20image/th_100103_synpower_eco_0w20_3l.png?format=webp&quality=100", source: "https://www.valvolineglobal.com/" },
  { file: "sakura-filter", direct: "https://www.sakurafilter.com/files/images/ProductImage/PCFOTO_encoded/_SAK001_C-1110_11.jpg", source: "https://www.sakurafilter.com/" },
  { file: "vic-filter", direct: "https://www.partspro.ph/cdn/shop/files/110-B_700x.jpg?v=1746523627", source: "https://www.partspro.ph/" },
  { file: "prestone-coolant", direct: "https://partsource.ca/cdn/shop/files/Untitleddesign_1800x1800.png?v=1715798778", source: "https://partsource.ca/" },
  { file: "wurth-interior-cleaner", direct: "https://eshop.wurth.rs/images/thumbs/0765157_sredstvo-za-ciscenje-unutrasnjosti-vozila-500-ml_500.webp", source: "https://eshop.wurth.rs/" },
  { file: "abro-chain-lube", direct: "https://cache1.pakwheels.com/ad_pictures/8536/abro-chain-lube-113-gm-cl-100-85366108.webp", source: "https://www.pakwheels.com/" },
  { file: "delphi-lockheed-dot3", direct: "https://static-01.daraz.lk/p/0ffa66aad3b8542106da3bb5d5028632.jpg", source: "https://www.daraz.lk/" },
  { file: "laugfs-revtron-4t", direct: "https://static-01.daraz.lk/p/dbf7b6b2e140e5c76574c42cd8683c26.jpg", source: "https://www.daraz.lk/" },
  { file: "totachi-fine-gasoline", direct: "https://www.totachi.lk/wp-content/uploads/2023/09/FINE-GASOLINE-10W30-old-design_1L.webp", source: "https://www.totachi.lk/" },
  { file: "petromin-a1-plus", direct: "https://bengalautobd.com/wp-content/uploads/2025/09/petomin-0w-20-1200x1284.jpg", source: "https://bengalautobd.com/" },
  { file: "sinopec-j500", direct: "https://image.made-in-china.com/2f0j00fpFvJtGngUkR/SINOPEC-JUSTAR-J500-Synthetic-Technology-SN-GF-5-5W-30-Engine-Oil.webp", source: "https://www.made-in-china.com/" },
  { file: "honda-dw1", direct: "https://bmeshop.bg/image/cache/catalog/Avto%20products/Parts/Masla/Honda_car_oil_ATF-DW1_1L-600x600.png", source: "https://bmeshop.bg/" },
];

const headers = { "user-agent": "Mozilla/5.0 (compatible; SaranankaraOilMart/1.0)" };

async function resolveImageUrl(item) {
  if (item.direct) return item.direct;
  const response = await fetch(item.page, { headers });
  if (!response.ok) throw new Error(`Page ${response.status}: ${item.page}`);
  const html = await response.text();
  const match = html.match(/class=["'][^"']*woocommerce-product-gallery__image[^"']*["'][^>]*>\s*<a\s+href=["']([^"']+)/i)
    ?? html.match(/class=["'][^"']*wp-post-image[^"']*["'][^>]*data-src=["']([^"']+)/i)
    ?? html.match(/data-src=["']([^"']+)["'][^>]*class=["'][^"']*wp-post-image/i)
    ?? html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i);
  if (!match) throw new Error(`No product image found on ${item.page}`);
  return match[1].replaceAll("&amp;", "&");
}

await mkdir(outputDirectory, { recursive: true });
const completed = [];
const failed = [];

for (const item of sources) {
  try {
    const imageUrl = await resolveImageUrl(item);
    const response = await fetch(imageUrl, { headers });
    if (!response.ok) throw new Error(`Image ${response.status}: ${imageUrl}`);
    const input = Buffer.from(await response.arrayBuffer());
    const output = await sharp(input)
      .rotate()
      .resize({ width: 900, height: 900, fit: "contain", background: "#f7f9fc", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
    await writeFile(path.join(outputDirectory, `${item.file}.webp`), output);
    completed.push({ file: `${item.file}.webp`, source: item.page ?? item.source, imageUrl });
    console.log(`downloaded ${item.file}.webp`);
  } catch (error) {
    failed.push({ file: item.file, reason: error instanceof Error ? error.message : String(error) });
    console.warn(`skipped ${item.file}: ${failed.at(-1).reason}`);
  }
}

await writeFile(
  path.resolve("docs/product-image-sources.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), completed, failed }, null, 2)}\n`,
);

console.log(`Completed ${completed.length}; failed ${failed.length}.`);
