import Link from "next/link";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { getPaymentSettings } from "@/features/payments/settings";
import { manufacturerContent } from "@/lib/catalog/manufacturer-content";
import { manufacturerImage } from "@/lib/catalog/manufacturer-images";
import { officialProductImage } from "@/lib/catalog/official-images";
import { CommerceBatchForm } from "@/components/admin/commerce-batch-form";

export default async function CommerceSetupPage({searchParams}:{searchParams:Promise<{page?:string;q?:string;needs?:string}>}) {
  const actor=await requireAdminPage("catalog.read");
  const params=await searchParams;
  const page=Math.min(5000,Math.max(1,Math.trunc(Number(params.page)||1)));
  const q=(params.q??"").trim().slice(0,200);
  const [products,payment]=await Promise.all([
    db.product.findMany({where:{status:{not:"ARCHIVED"}},select:{id:true,updatedAt:true,name:true,sku:true,status:true,standardPriceMinor:true,loyaltyPriceMinor:true,acceptsPreOrders:true,technicalSpecs:true,brand:{select:{name:true}},_count:{select:{images:true}}},orderBy:[{name:"asc"},{id:"asc"}]}),
    getPaymentSettings(),
  ]);
  const env=getEnv();
  const active=products.filter(p=>p.status==="ACTIVE");
  const images=active.filter(p=>p._count.images===0 && !officialProductImage(p.sku) && !manufacturerImage(p.brand?.name,p.name)).length;
  const loyalty=active.filter(p=>p.standardPriceMinor>0n && p.loyaltyPriceMinor===null).length;
  const descriptions=active.filter(p=>!manufacturerContent(p.brand?.name,p.name) && !(p.technicalSpecs as Record<string,unknown>|null)?.["Manufacturer URL"]).length;
  const preorders=active.filter(p=>p.acceptsPreOrders).length;
  const sms=env.SMS_PROVIDER==="sms-gate" && Boolean(env.SMS_GATE_URL&&env.SMS_GATE_TOKEN&&env.SMS_GATE_DEVICE_ID);
  const email=env.EMAIL_PROVIDER==="resend" && Boolean(env.RESEND_API_KEY&&env.EMAIL_FROM);
  const gateway=Boolean(env.PAYHERE_MERCHANT_ID&&env.PAYHERE_MERCHANT_SECRET);
  const rows=[
    {name:"Cash pickup",ready:payment.cashEnabled,detail:payment.cashEnabled?"Enabled after shop confirmation":"Disabled",href:"/admin/payments"},
    {name:"Bank transfer",ready:payment.bankEnabled,detail:payment.bankEnabled?"Receiving details configured; shop verifies funds":"Enter receiving details and enable",href:"/admin/payments"},
    {name:"Phone transfer",ready:payment.phoneEnabled,detail:payment.phoneEnabled?"Receiving number configured; shop verifies funds":"Enter the registered receiving number and enable",href:"/admin/payments"},
    {name:"Hosted payments",ready:payment.hostedEnabled,detail:payment.hostedEnabled?"Hosted payments enabled":"Enable the merchant provider and checkout domain",href:"/admin/payments"},
    {name:"Automatic PayHere",ready:gateway&&payment.hostedEnabled&&payment.hostedHost===(env.PAYHERE_MODE==="live"?"www.payhere.lk":"sandbox.payhere.lk"),detail:gateway?`${env.PAYHERE_MODE??"sandbox"} credentials configured; confirm the provider hostname before testing`:"Merchant ID and secret required in the server environment",href:"/admin/payments"},
    {name:"SMS verification",ready:sms,detail:sms?"Private phone gateway configured; verify delivery before launch":"Connect the owner's phone and private gateway",href:"/admin/loyalty"},
    {name:"Email verification",ready:email,detail:email?"Email delivery configured; verify the sender before launch":"Configure Resend and a verified sender",href:"/admin/loyalty"},
    {name:"Loyalty prices",ready:loyalty===0,detail:`${loyalty} active priced products need a loyalty price. Use the reviewed batch below.`,href:"/admin/launch?needs=loyalty"},
    {name:"Preorders",ready:preorders>0,detail:`${preorders} active products accept approval-required preorders. Choose eligible products below.`,href:"/admin/launch?needs=preorders"},
    {name:"Product photographs",ready:images===0,detail:`${images} active products have no uploaded or verified manufacturer image. Review exact-product sources before publishing.`,href:"/admin/products?images=missing"},
    {name:"Manufacturer sources",ready:descriptions===0,detail:`${descriptions} active products have no verified summary or recorded manufacturer URL. A URL alone does not verify the description.`,href:"/admin/products"},
  ];
  const filtered=products.filter(p=>(!q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()))&&(params.needs!=="loyalty" || (p.standardPriceMinor>0n&&p.loyaltyPriceMinor===null))&&(params.needs!=="preorders"||!p.acceptsPreOrders));
  const pageCount=Math.max(1,Math.ceil(filtered.length/20));
  const currentPage=Math.min(page,pageCount);
  const visible=filtered.slice((currentPage-1)*20,currentPage*20);
  function pageLink(value:number){const values=new URLSearchParams({page:String(value)});if(q)values.set("q",q);if(params.needs)values.set("needs",params.needs);return `/admin/launch?${values}`;}
  return <>
    <div className="admin-breadcrumb"><Link href="/admin">Overview</Link><span>Commerce setup</span></div>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Owner checklist</p><h1>Commerce setup</h1><p>Review what is configured, then choose the products and prices the shop wants to offer. No live charge or message is sent from this screen.</p></div></div>
    <section className="admin-table-card mb-8"><div className="admin-table-scroll"><table className="admin-product-table"><thead><tr><th>Requirement</th><th>Configuration</th><th>Next step</th></tr></thead><tbody>{rows.map(row=><tr key={row.name}><th scope="row">{row.name}</th><td><strong>{row.ready?"Configured":"Needs setup"}</strong><p>{row.detail}</p></td><td><Link className="text-link" href={row.href}>Review</Link></td></tr>)}</tbody></table></div></section>
    <section className="admin-panel"><h2 className="font-display text-2xl">Catalogue setup</h2><p className="mb-5">Set the chosen loyalty discount or enable preorders for selected products. Verified pack offers and exact prices can also be entered individually in each product editor.</p>
      <form noValidate className="admin-filterbar"><label>Search<input name="q" defaultValue={q} placeholder="Product or SKU"/></label><select name="needs" aria-label="Setup filter" defaultValue={params.needs??""}><option value="">All products</option><option value="loyalty">Needs loyalty price</option><option value="preorders">Preorders disabled</option></select><button>Filter</button></form>
      {actor.permissions.has("catalog.write")?<CommerceBatchForm key={`${currentPage}-${q}-${params.needs??""}-${visible.map(p=>p.updatedAt.toISOString()).join()}`} products={visible.map(p=>({id:p.id,updatedAt:p.updatedAt.toISOString(),name:p.name,sku:p.sku,retail:p.standardPriceMinor.toString(),loyalty:p.loyaltyPriceMinor?.toString()??null,preorders:p.acceptsPreOrders}))}/>:<p>Catalogue editing permission is required to apply changes.</p>}
      <nav aria-label="Catalogue setup pages" className="mt-6 flex flex-wrap items-center gap-5">{currentPage>1&&<Link className="text-link" href={pageLink(currentPage-1)}>Previous</Link>}<span>Page {currentPage} of {pageCount} · {filtered.length} products</span>{currentPage<pageCount&&<Link className="text-link" href={pageLink(currentPage+1)}>Next</Link>}</nav>
    </section>
  </>;
}
