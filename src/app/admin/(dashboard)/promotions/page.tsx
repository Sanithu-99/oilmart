import { BadgePercent, Plus } from "lucide-react";

import { savePromotionAction } from "@/features/admin/catalog-actions";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { DiscountScope, PromotionType } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";

export default async function PromotionsPage() {
  await requireAdminPage("promotions.manage");
  const [promotions, products, categories] = await Promise.all([
    db.promotion.findMany({ include: { products: true, categories: true }, orderBy: [{ active: "desc" }, { priority: "desc" }] }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true } }),
    db.category.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true } }),
  ]);
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Pricing rules</p><h1>Promotions</h1><p>Schedules and scopes are validated server-side; the storefront chooses one deterministic best price.</p></div></div>
    <div className="admin-management-grid">
      <section className="admin-form-card"><div className="admin-form-card-heading"><div><Plus size={17}/><h2>New promotion</h2></div></div><PromotionForm products={products} categories={categories}/></section>
      <section className="admin-list-stack">{promotions.map((promotion) => <details key={promotion.id} className="admin-disclosure"><summary><span><BadgePercent size={17}/></span><div><strong>{promotion.name}</strong><small>{promotion.type.replaceAll("_", " ")} · priority {promotion.priority}</small></div><em className={`admin-status ${promotion.active ? "admin-status-active" : "admin-status-inactive"}`}>{promotion.active ? "ACTIVE" : "INACTIVE"}</em></summary><PromotionForm promotion={promotion} products={products} categories={categories}/></details>)}</section>
    </div>
  </>;
}

type PromotionRecord = Awaited<ReturnType<typeof db.promotion.findMany<{ include: { products: true; categories: true } }>>>[number];
function dateValue(value: Date | null | undefined) {
  if (!value) return "";
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function PromotionForm({ promotion, products, categories }: { promotion?: PromotionRecord; products: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }> }) {
  const selectedProducts = new Set(promotion?.products.map((item) => item.productId));
  const selectedCategories = new Set(promotion?.categories.map((item) => item.categoryId));
  return <form action={savePromotionAction} className="admin-inline-form">
    {promotion && <input type="hidden" name="id" value={promotion.id}/>}<label className="admin-field span-2">Name<input name="name" defaultValue={promotion?.name} required/></label>
    <label className="admin-field">Type<select name="type" defaultValue={promotion?.type ?? PromotionType.PERCENTAGE}>{Object.values(PromotionType).map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="admin-field">Scope<select name="scope" defaultValue={promotion?.scope ?? DiscountScope.PRODUCT}>{[DiscountScope.PRODUCT, DiscountScope.CATEGORY].map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="admin-field">Percentage<input name="percentage" type="number" min="0.01" max="100" step="0.01" defaultValue={promotion?.percentageBasisPoints ? promotion.percentageBasisPoints / 100 : ""}/></label>
    <label className="admin-field">Amount / fixed price (LKR)<input name="amount" inputMode="decimal" defaultValue={promotion?.amountMinor ? Number(promotion.amountMinor) / 100 : ""}/></label>
    <label className="admin-field">Starts<input name="startsAt" type="datetime-local" defaultValue={dateValue(promotion?.startsAt)}/></label><label className="admin-field">Ends<input name="endsAt" type="datetime-local" defaultValue={dateValue(promotion?.endsAt)}/></label>
    <label className="admin-field">Priority<input name="priority" type="number" defaultValue={promotion?.priority ?? 0}/></label><label className="admin-check"><input name="active" type="checkbox" defaultChecked={promotion?.active}/><span>Active</span></label><label className="admin-check"><input name="loyaltyOnly" type="checkbox" defaultChecked={promotion?.loyaltyOnly}/><span>Loyalty only</span></label>
    <fieldset className="admin-checkbox-group"><legend>Products</legend>{products.map((item) => <label key={item.id}><input type="checkbox" name="productIds" value={item.id} defaultChecked={selectedProducts.has(item.id)}/>{item.name}</label>)}</fieldset>
    <fieldset className="admin-checkbox-group"><legend>Categories</legend>{categories.map((item) => <label key={item.id}><input type="checkbox" name="categoryIds" value={item.id} defaultChecked={selectedCategories.has(item.id)}/>{item.name}</label>)}</fieldset>
    <button className="admin-primary-button">{promotion ? "Save promotion" : "Create promotion"}</button>
  </form>;
}
