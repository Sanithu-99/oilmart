# Product photo update - 27 November 2026

Added sixteen exact-SKU photo updates: five previously missing images and eleven replacements for imported family/thumbnail pictures. Fourteen replacements come from larger 825-1500 pixel source canvases; the Caltex 6L campaign crop and ABRO product-sheet extraction retain standard native resolution. No image was enlarged, redrawn, sharpened to invent label detail, or reused across another grade/pack size. Original compression can still limit clarity even when the pixel dimensions are larger.

## Changes

- Thirteen Mobil product photographs from McLarens Lubricants, the Sri Lankan authorized distributor. Distinct photos now cover 1L/4L 10W-30 and 10W-40, 4L 5W-30, 5L Delvac 1 5W-40, 1L Delvac Legend Heavy Duty, 1L Mobil 1 ESP 5W-30, 1L Extra 4T 10W-40, 1L Super 4T 20W-50, 1L CVTF, 1L DEXRON-VI and 1L Multipurpose ATF. Four of these previously had no photo. Current-pack branding may differ from older batches; product families, viscosity and visible capacities were checked against each source.
- Caltex Delo Gold Ultra 15W-40 **6L** now uses the manufacturer's exact 6L bottle, replacing a reused photograph labelled **5L**. Native 368x610 frame, approximately 345x555 bottle detail. The crop excludes unrelated campaign copy while preserving the complete bottle and label. It is not called high resolution.
- Würth Interior Cleaner 500ml now uses the manufacturer's 1000px original instead of the imported 500px derivative. Manufacturer compression remains visible; a supplier photograph can improve it further.
- ABRO Radiator Flush 354ml now has the exact **AB-505** photo extracted from its official product sheet, with the part number and volume visible. Native 269x581; standard resolution, not enlarged. This avoids the differently coded photograph on the generic product page.

The exact source URL, original dimensions, grade/pack checks and rejected ambiguous matches are retained in `image-upgrades-mobil-2026-11-27.json`, `image-upgrades-caltex-2026-11-27.json` and `image-upgrades-accessories-2026-11-27.json`. Product-label contact-sheet evidence is in `mobil-photo-inspection-2026-11-27.jpg`.

## Remaining owner photos

The 313 imported records now have **116 missing storefront photos**, down from 121. These figures describe imported records and presentation fallbacks; no database image or stock record was modified. Existing owner uploads keep priority.

`image-quality-review-2026-11-27.csv` lists every SKU and public product link. Filter `missing=true` for the remaining missing photos, `needsClearerPhoto=true` for 31 entries flagged by known low-resolution originals or the pixel-content heuristic, and `sharedImportedImage=true` for 156 records still using a shared imported packshot that needs an identity check. These flags can overlap. Sharing alone does not establish that an image is wrong, and dimensions alone cannot prove sharpness or reveal all prior upscaling.

Many remaining items have incomplete filter codes, unbranded accessories, unclear L/S pack sizes or loose-oil labels. Exact manufacturer photos cannot safely be assigned without the actual label/pack identity. Caltex's standalone manufacturer originals checked in both Sri Lanka and the global catalogue remain only 250x350 pixels. Clear front/back supplier photos are needed for these records; another grade or a generic bottle would give a misleading picture.

Public manufacturer/distributor source provenance is retained. Separate commercial reuse permission and the actual supplied batch's appearance remain owner checks. No retailer watermark was removed or generated product image substituted.

## Validation

- 25 targeted image/content tests passed, including real asset decoding, dimensions, unknown-SKU rejection, grade/pack separation and honest standard-resolution flags.
- Eight read-only product-page checks passed across Chromium desktop and Pixel 7 mobile. They verified the actual image source and loaded native width, including previously missing and replaced photos.
- ESLint and the production build including TypeScript passed; 82 pages were processed.

Regenerate the quality worksheet using `pnpm --use-node-version=22.16.0 exec tsx scripts/content/audit-image-quality.ts`.
