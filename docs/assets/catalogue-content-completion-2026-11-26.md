# Manufacturer content and exact product photographs

Checked 26 November 2026 against the 313-row imported inventory. The database has additional legacy/draft records; this report does not change any database row.

The storefront now resolves original, source-linked descriptions for **88 imported products**, up from 13. Coverage is 61 Caltex, seven Delphi, seven Mobil, six ABRO, three Castrol, two Valvoline, one Totachi and one Eurol. Each new summary stores its review date and whether the source is Sri Lankan, Asian or global. Regional sources do not establish that every supplied batch has identical approvals; summaries avoid vehicle recommendations, invented certifications and extended-drain guarantees.

Matching uses an exact brand and a reviewed family alias. Pack notation, `SAE`, and documented loose/tin/pack suffixes can vary, but viscosity grades, DOT levels and formulation names remain significant. Unknown products continue to use conservative shop content. A claim about one similar product is not copied to another grade.

The original manufacturer source links are retained in `src/lib/catalog/manufacturer-summaries.ts` and the generated JSON export. Caltex facts come from `caltex.lk`; other primary sources include Mobil, Delphi APAC, Castrol's official PDS service, Totachi's SP technical sheet, Eurol and Valvoline Asia. ABRO source records identify the 354 ml additive or 443 ml flush product codes where available.

## Owner review queue

Run `pnpm --use-node-version=22.16.0 exec tsx scripts/content-review.ts` to regenerate:

- `catalogue-content-review-2026-11-26.csv`: filterable owner worksheet with SKU, brand, name, missing photo, photo quality and description flags, image path, source URL and source region. It includes both the exact-name `manufacturerImage` and exact-SKU `officialProductImage` display fallbacks.
- `catalogue-content-review-2026-11-26.json`: same inventory plus the full original description and current image path.

**225 product descriptions still require exact manufacturer identification.** For these, collect the label's complete name, part number, grade/formulation, front/back photograph and current manufacturer PDS. In particular, imported short Sakura filter codes cannot be assumed to match similarly numbered Sakura catalogue items: for example, the public catalogue returns C-1110-family records for the search C-111. Several unbranded accessories and loose products have no manufacturer identity. Do not invent an official source for them.

The green Caltex XLI inventory says `Mixed`, while its source page describes concentrate. It remains in the review queue instead of publishing a guessed dilution. The red premixed product has its own exact summary. Unknown DOT grades and different gear-oil viscosities also remain separate.

## Photographs

Six exact ABRO manufacturer photographs are now stored in `public/images/products/verified/` and selected by the full product name including pack size. Their source pages, raw URLs, dimensions and review status are in `verified-product-images-2026-11-26.json`. Five previously missing images are filled; the chain-lube image replaces an imported third-party packshot. The originals range from 900 to 2,000 pixels; conversion never enlarges source detail. Owner-uploaded photographs take priority over these imported defaults.

Viewed labels confirm CL-100 113 g, MF-390 443 ml, DI-502 354 ml and IC-509 354 ml. OB-506 and SS-510 match the manufacturer's 354 ml listings. Packaging may vary by batch. The public manufacturer source is provenance, not a claim that the shop has obtained a reproduction licence; the owner should retain the relevant supplier/manufacturer permission.

Four further exact-SKU photographs are included from `officialProductImage`: Eurol ATF 7400 1 L, Wurth windscreen concentrate 32 ml, Wurth black PVC tape 19 mm x 10 m, and Prestone ATF + Stop Leak 946 ml. Their provenance is in `official-image-sources-2026-11-26.json`. Together the two mappings supply **ten manufacturer photo assets**, including **nine high-resolution assets**, and fill nine previously missing product images.

**121 imported products still have no photograph in the storefront**, compared with 130 database rows without attached image records. These are presentation fallbacks; no image records were inserted into the database. The Prestone source is only **300 x 493 pixels** and remains flagged `photoQualityNeedsReview` in both exports. It is an exact product image, but a clearer supplier photograph is still needed. Other existing photographs have not all passed a quality review: a nonmissing image is not a statement of high resolution.

Previously checked official Caltex packshots remain only 250 x 350 pixels and are not described as high resolution. ABRO's radiator-flush page currently lists AB-505 while the linked photo is named RF-505, so no automatic photo substitution is made for that item.

Regenerate the six images with `pnpm --use-node-version=22.16.0 exec node scripts/content/fetch-verified-images.mjs` only when intentionally refreshing the checked primary-source images. The script requires at least 600 source pixels per side and fails rather than upscaling a small picture.

## Verification

Targeted tests cover exact family matching, grade separation, unknown-product rejection, source dates/regions, pack-specific image matching and removal of legacy fitment sentences. The work makes no production database writes and does not publish a new stock quantity, loyalty discount or free-litre offer.
