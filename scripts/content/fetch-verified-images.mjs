import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Exact manufacturer-labelled pack photographs; no inferred grade or generic packshot.
const sources = [
  {brand:"ABRO",name:"ABRO Chain Lube 113g",file:"abro-cl-100-113g.webp",page:"https://abro.com/product/chain-lube/",image:"https://abro.com/wp-content/uploads/2020/07/CL-100-CH-WH.jpg"},
  {brand:"ABRO",name:"Motor Flush 443 ml",file:"abro-mf-390-443ml.webp",page:"https://abro.com/product/motor-flush/",image:"https://abro.com/wp-content/uploads/2020/07/MF-390-MOTOR-FLUSH-copy.jpg"},
  {brand:"ABRO",name:"Diesel Injector Cleaner 354 ml",file:"abro-di-502-354ml.webp",page:"https://abro.com/product/diesel-injector-cleaner/",image:"https://abro.com/wp-content/uploads/2020/07/DI-502-Diesel-Injection-Cleaner.jpg"},
  {brand:"ABRO",name:"Fuel Injector Cleaner 354 ml",file:"abro-ic-509-354ml.webp",page:"https://abro.com/product/fuel-injector-cleaner/",image:"https://abro.com/wp-content/uploads/2020/07/IC-509-Fuel-Injector-Cleaner.jpg"},
  {brand:"ABRO",name:"Octane Booster 354 ml",file:"abro-ob-506-354ml.webp",page:"https://abro.com/product/octane-booster/",image:"https://abro.com/wp-content/uploads/2020/07/OB-506-Octane-Booster.jpg"},
  {brand:"ABRO",name:"Smoke STOP 354 ml",file:"abro-ss-510-354ml.webp",page:"https://abro.com/product/smoke-stop/",image:"https://abro.com/wp-content/uploads/2020/07/SS-510-SMOKE-STOP.jpg"},
];
await mkdir("public/images/products/verified",{recursive:true});
const results=[];
for(const source of sources){
  const response=await fetch(source.image,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(`Official image request failed: ${response.status}`);
  const input=Buffer.from(await response.arrayBuffer());
  const metadata=await sharp(input).metadata();
  if(!metadata.width||!metadata.height||Math.min(metadata.width,metadata.height)<600)throw new Error("Source is too small; never enlarge it to imply detail.");
  const output=await sharp(input).rotate().resize({width:1000,height:1000,fit:"inside",withoutEnlargement:true}).webp({quality:92}).toBuffer({resolveWithObject:true});
  await writeFile(`public/images/products/verified/${source.file}`,output.data);
  results.push({...source,sku:undefined,local:`/images/products/verified/${source.file}`,sourceWidth:metadata.width,sourceHeight:metadata.height,width:output.info.width,height:output.info.height,checkedAt:"2026-11-26",status:"Exact product and pack matched to manufacturer page; supplied batch/packaging still needs owner confirmation."});
}
await writeFile("docs/assets/verified-product-images-2026-11-26.json",JSON.stringify(results,null,2)+"\n");
console.log(JSON.stringify(results,null,2));
