import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const inventory=JSON.parse(readFileSync("prisma/data/inventory-products.json","utf8")) as Array<{sku:string;slug:string}>;
const cases=[
  {sku:"INV-E8B337ACEF",file:"mobil-cvtf-1l.webp",width:1080},
  {sku:"INV-6D4FAAF535",file:"mobil-super-10w40-4l.webp",width:825},
  {sku:"INV-21CAF07E53",file:"caltex-delo-gold-ultra-15w40-6l.webp",width:368},
  {sku:"INV-61377B8291",file:"accessory-abro-radiator-flush-354ml.webp",width:269},
];
for(const item of cases){
  test(`displays the exact upgraded pack photo for ${item.sku}`,async({page})=>{
    const product=inventory.find(product=>product.sku===item.sku)!;
    await page.goto(`/en/products/${product.slug}`,{waitUntil:"domcontentloaded"});
    const image=page.locator(".product-gallery-active-image");
    await expect(image).toBeVisible({timeout:30000});
    await expect(image).toHaveAttribute("src",new RegExp(`/verified-2026-11-27/${item.file.replaceAll(".","\\.")}$`));
    await expect.poll(()=>image.evaluate(element=>(element as HTMLImageElement).naturalWidth),{timeout:30000}).toBe(item.width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    await image.screenshot({path:`test-results/photo-${item.sku}-${test.info().project.name}.png`});
  });
}
