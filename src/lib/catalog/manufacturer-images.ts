// Exact pack photographs downloaded from the manufacturer, reviewed 26 November 2026.
// Match the full inventory name, including pack size; never share an image across grades.
const images = [
  {brand:"ABRO",name:"ABRO Chain Lube 113g",url:"/images/products/verified/abro-cl-100-113g.webp",width:1000,height:1000},
  {brand:"ABRO",name:"Motor Flush 443 ml",url:"/images/products/verified/abro-mf-390-443ml.webp",width:900,height:900},
  {brand:"ABRO",name:"Diesel Injector Cleaner 354 ml",url:"/images/products/verified/abro-di-502-354ml.webp",width:900,height:900},
  {brand:"ABRO",name:"Fuel Injector Cleaner 354 ml",url:"/images/products/verified/abro-ic-509-354ml.webp",width:900,height:900},
  {brand:"ABRO",name:"Octane Booster 354 ml",url:"/images/products/verified/abro-ob-506-354ml.webp",width:900,height:900},
  {brand:"ABRO",name:"Smoke STOP 354 ml",url:"/images/products/verified/abro-ss-510-354ml.webp",width:900,height:900},
];
const exactKey=(value:string)=>value.toLowerCase().replace(/\s+/g," ").trim();
export function manufacturerImage(brand:string|undefined,name:string){
  const image=images.find(item=>exactKey(item.brand)===exactKey(brand??"")&&exactKey(item.name)===exactKey(name));
  return image?{url:image.url,alt:`${image.brand} ${image.name} — manufacturer pack photograph; packaging may vary`,width:image.width,height:image.height}:null;
}
