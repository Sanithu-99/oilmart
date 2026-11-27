"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { setupCommerceBatchAction } from "@/features/admin/commerce-setup-actions";
import { discountedLoyaltyPrice } from "@/features/admin/commerce-setup-rules";
import { formatLkr } from "@/lib/pricing/money";

export type CommerceSetupProduct = {id:string;updatedAt:string;name:string;sku:string;retail:string;loyalty:string|null;preorders:boolean};

export function CommerceBatchForm({products}:{products:CommerceSetupProduct[]}) {
  const [selected,setSelected] = useState<string[]>([]);
  const [operation,setOperation] = useState("LOYALTY");
  const [discount,setDiscount] = useState("");
  const [reason,setReason] = useState("");
  const [acknowledged,setAcknowledged] = useState(false);
  const [state,action,pending] = useActionState(setupCommerceBatchAction,{});
  const chosen = products.filter(p=>selected.includes(p.id));
  function preview(product:CommerceSetupProduct) {
    if(operation!=="LOYALTY" || !selected.includes(product.id)) return "—";
    try{return formatLkr(discountedLoyaltyPrice(BigInt(product.retail),discount));}catch{return "Enter a valid discount";}
  }
  return <form noValidate action={action} onReset={event=>event.preventDefault()} className="space-y-6">
    <input type="hidden" name="products" value={JSON.stringify(chosen.map(({id,updatedAt})=>({id,updatedAt})))}/>
    <div className="admin-form-grid">
      <label className="admin-field">Change<select name="operation" value={operation} onChange={e=>setOperation(e.target.value)} disabled={pending || Boolean(state.success)}><option value="LOYALTY">Set loyalty discount</option><option value="ENABLE_PREORDERS">Enable approval-required preorders</option><option value="DISABLE_PREORDERS">Disable new preorders</option></select></label>
      {operation==="LOYALTY" && <label className="admin-field">Discount from each retail price (%)<input name="discount" inputMode="decimal" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="Enter the shop's chosen discount" required disabled={pending || Boolean(state.success)}/><small>Updates product loyalty prices and every size variant using its own retail price. Prices must remain positive and lower than retail.</small></label>}
      <label className="admin-field span-2">Reason for this change<textarea className="resize-none" rows={3} name="reason" minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} required disabled={pending || Boolean(state.success)}/></label>
    </div>
    <p role="status">{selected.length} {selected.length===1?"product":"products"} selected on this page. Review the preview before applying.</p>
    <p className="text-sm">Scroll the table horizontally to compare every price before applying changes.</p>
    <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-product-table"><thead><tr>
      <th><input type="checkbox" aria-label="Select every product on this page" checked={products.length>0 && selected.length===products.length} onChange={e=>setSelected(e.target.checked?products.map(p=>p.id):[])} disabled={pending || Boolean(state.success)}/></th><th>Product</th><th>Retail</th><th>Current loyalty</th><th>{operation==="LOYALTY"?"New loyalty preview":"Preorder change"}</th>
    </tr></thead><tbody>{products.map(product=><tr key={product.id}>
      <td><input type="checkbox" aria-label={`Select ${product.name}`} checked={selected.includes(product.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,product.id]:current.filter(id=>id!==product.id))} disabled={pending || Boolean(state.success)}/></td>
      <td><Link href={`/admin/products/${product.id}`} className="text-link">{product.name}</Link><small className="block">{product.sku}</small></td><td>{BigInt(product.retail)>0?formatLkr(BigInt(product.retail)):"Needs retail price"}</td><td>{product.loyalty?formatLkr(BigInt(product.loyalty)):"Not set"}</td>
      <td>{operation==="LOYALTY"?preview(product):selected.includes(product.id)?operation==="ENABLE_PREORDERS"?"Enable; approval still required":"Disable new requests":product.preorders?"Currently enabled":"Currently disabled"}</td>
    </tr>)}</tbody></table></div></div>
    {!products.length && <p>No products match these filters. Change the filters to continue.</p>}
    <label className="admin-check"><input type="checkbox" name="acknowledged" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} required disabled={pending || Boolean(state.success)}/><span>I reviewed these products and prices and authorize this change. Enabling preorders does not approve a customer request.</span></label>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}{state.success && <p role="status">{state.success} <Link className="text-link" href="/admin/launch" prefetch={false}>Reload setup</Link></p>}
    <button className="admin-primary-button" type="submit" disabled={pending || !selected.length || !acknowledged || Boolean(state.success)}>{pending?"Applying changes…":"Apply reviewed changes"}</button>
  </form>;
}
