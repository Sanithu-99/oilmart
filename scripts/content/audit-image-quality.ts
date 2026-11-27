import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { officialProductImage } from "../../src/lib/catalog/official-images";
import { manufacturerImage } from "../../src/lib/catalog/manufacturer-images";

type Product={sku:string;name:string;brand:string|null;slug:string;image:string|null};
const products=JSON.parse(await readFile("prisma/data/inventory-products.json","utf8")) as Product[];
const knownSources=JSON.parse(await readFile("docs/assets/photo-source-check-2026-11-25.json","utf8")) as Array<{file:string;sourceWidth:number;sourceHeight:number}>;
const sharedCounts=new Map<string,number>();
for(const product of products)if(product.image)sharedCounts.set(product.image,(sharedCounts.get(product.image)??0)+1);
const inspected=new Map<string,Promise<{width:number;height:number;foregroundWidth:number;foregroundHeight:number}>>();
function inspect(url:string){
  let existing=inspected.get(url);
  if(!existing){
    existing=(async()=>{
      const file=path.resolve("public",url.replace(/^\//,""));
      if(!file.startsWith(path.resolve("public")+path.sep))throw new Error("Unexpected image path");
      const bytes=await readFile(file);
      const metadata=await sharp(bytes).metadata();
      const trimmed=await sharp(bytes).flatten({background:"#ffffff"}).trim({background:"#ffffff",threshold:20}).toBuffer({resolveWithObject:true});
      return {width:metadata.width!,height:metadata.height!,foregroundWidth:trimmed.info.width,foregroundHeight:trimmed.info.height};
    })();
    inspected.set(url,existing);
  }
  return existing;
}
const rows=[];
for(const product of products){
  const verified=officialProductImage(product.sku)??manufacturerImage(product.brand??undefined,product.name);
  const url=verified?.url??product.image;
  const dimensions=url?await inspect(url):null;
  // A large empty canvas cannot make a tiny embedded packshot high resolution.
  const knownSource=!verified&&url?knownSources.find(source=>source.file===path.basename(url)):null;
  const lowDetail=Boolean(knownSource&&Math.max(knownSource.sourceWidth,knownSource.sourceHeight)<550 || dimensions&&Math.max(dimensions.foregroundWidth,dimensions.foregroundHeight)<550);
  rows.push({sku:product.sku,brand:product.brand,name:product.name,url,missing:!url,needsClearerPhoto:lowDetail,sharedImportedImage:!verified&&Boolean(product.image&&(sharedCounts.get(product.image)??0)>1),sourceNativeWidth:knownSource?.sourceWidth??null,sourceNativeHeight:knownSource?.sourceHeight??null,verifiedReplacement:Boolean(verified),...dimensions,productUrl:`/en/products/${product.slug}`});
}
const report={checkedAt:"2026-11-27",scope:"313 imported products; owner-uploaded database images are not changed",method:"Decode local image bytes, inspect known original-source dimensions from the 25 November provenance check, and measure nonwhite bounds. Long edge below 550 pixels is a review heuristic. Encoded or foreground size alone cannot detect prior upscaling or guarantee sharpness. Shared imported packshots require an identity check. No enlargement or database writes.",missing:rows.filter(r=>r.missing).length,lowDetail:rows.filter(r=>r.needsClearerPhoto).length,sharedImportedImageProducts:rows.filter(r=>r.sharedImportedImage).length,verifiedPhotoProducts:rows.filter(r=>r.verifiedReplacement).length,rows};
await writeFile("docs/assets/image-quality-review-2026-11-27.json",JSON.stringify(report,null,2)+"\n");
const columns=["sku","brand","name","missing","needsClearerPhoto","sharedImportedImage","url","sourceNativeWidth","sourceNativeHeight","foregroundWidth","foregroundHeight","productUrl"] as const;
const cell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
await writeFile("docs/assets/image-quality-review-2026-11-27.csv",columns.join(",")+"\n"+rows.map(row=>columns.map(column=>cell(row[column])).join(",")).join("\n")+"\n");
console.log(JSON.stringify({...report,rows:undefined},null,2));
