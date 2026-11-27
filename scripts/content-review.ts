import { readFile, mkdir, writeFile } from "node:fs/promises";
import { manufacturerContent } from "../src/lib/catalog/manufacturer-content";
import { manufacturerImage } from "../src/lib/catalog/manufacturer-images";
import { officialProductImage } from "../src/lib/catalog/official-images";

type InventoryRow = {sku: string; name: string; brand: string | null; slug: string; image: string | null; specifications: Record<string, unknown>};
const inventory = JSON.parse(await readFile("prisma/data/inventory-products.json", "utf8")) as InventoryRow[];
const rows = inventory.map(product => {
  const verified = manufacturerContent(product.brand ?? undefined, product.name);
  const officialPhoto = officialProductImage(product.sku);
  const verifiedPhoto = officialPhoto ?? manufacturerImage(product.brand ?? undefined, product.name);
  return {sku:product.sku,slug:product.slug,name:product.name,brand:product.brand,sourceUrl:verified?.url??null,sourceRegion:verified?.sourceRegion??null,originalDescription:verified?.description??null,descriptionNeedsReview:!verified,photoMissing:!product.image&&!verifiedPhoto,photoQualityNeedsReview:officialPhoto?.highResolution===false,verifiedManufacturerPhoto:Boolean(verifiedPhoto),verifiedPhotoHighResolution:verifiedPhoto?officialPhoto?.highResolution??true:null,existingPhoto:verifiedPhoto?.url??product.image,reviewReason:!verified?"Confirm exact manufacturer product and formulation from label or supplier; do not substitute a similar grade.":null};
});
await mkdir("docs/assets",{recursive:true});
const report={checkedAt:"2026-11-26",source:"prisma/data/inventory-products.json with manufacturerImage and officialProductImage presentation fallbacks; no database writes",total:rows.length,verifiedDescriptionProducts:rows.filter(row=>!row.descriptionNeedsReview).length,descriptionReviewNeeded:rows.filter(row=>row.descriptionNeedsReview).length,missingPhotos:rows.filter(row=>row.photoMissing).length,newVerifiedManufacturerPhotos:rows.filter(row=>row.verifiedManufacturerPhoto).length,newHighResolutionManufacturerPhotos:rows.filter(row=>row.verifiedPhotoHighResolution).length,newPhotosNeedingQualityReview:rows.filter(row=>row.photoQualityNeedsReview).length,rows};
await writeFile("docs/assets/catalogue-content-review-2026-11-26.json",JSON.stringify(report,null,2)+"\n");
const columns=["sku","brand","name","descriptionNeedsReview","photoMissing","photoQualityNeedsReview","verifiedManufacturerPhoto","verifiedPhotoHighResolution","existingPhoto","sourceUrl","sourceRegion","reviewReason"] as const;
const csvCell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
await writeFile("docs/assets/catalogue-content-review-2026-11-26.csv",columns.join(",")+"\n"+rows.map(row=>columns.map(key=>csvCell(row[key])).join(",")).join("\n")+"\n");
console.log(JSON.stringify({...report,rows:undefined},null,2));
