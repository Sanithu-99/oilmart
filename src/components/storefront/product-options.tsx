"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPurchase } from "./product-purchase";
import { commerceCopy } from "@/lib/i18n/commerce";
import { formatLkr } from "@/lib/pricing/money";
import type { StoreProduct } from "@/features/catalog/queries";

export function ProductOptions({ variants, sizes, slug, locale, addLabel, loose }: {
  variants: StoreProduct["variants"]; sizes: Array<{ slug: string; name: string }>;
  slug: string; locale: string; addLabel: string; loose: boolean;
}) {
  const [selected, setSelected] = useState(variants[0]?.id ?? "");
  const router = useRouter();
  const copy = commerceCopy(locale);
  const variant = variants.find((item) => item.id === selected);
  return <div className="product-options">
    {sizes.length > 1 && <label className="product-size-label">{copy.sizes}<select value={slug} onChange={(event) => router.push(`/${locale}/products/${event.target.value}`)}>{sizes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>}
    {variants.length > 1 && <label className="product-size-label">{copy.sizes}<select value={selected} onChange={(event) => setSelected(event.target.value)}>{variants.map((item) => <option key={item.id} value={item.id}>{item.name} — {BigInt(item.priceMinor) > 0n ? formatLkr(BigInt(item.priceMinor), `${locale}-LK`) : "—"}</option>)}</select></label>}
    {loose && <p className="mt-3 text-sm text-muted-foreground">{copy.loose}</p>}
    {variant && variants.length > 1 && <div className="mt-4" aria-live="polite"><strong>{BigInt(variant.priceMinor) > 0n ? formatLkr(BigInt(variant.priceMinor), `${locale}-LK`) : "—"}</strong><p className="price-change-notice">{copy.priceNotice}</p><p className="text-sm">{copy.quantity}: {variant.available}</p></div>}
    {variant && BigInt(variant.priceMinor) > 0n && <ProductPurchase key={variant.id} variantId={variant.id} available={variant.available} minQuantity={variant.minQuantity} quantityStep={variant.quantityStep} label={addLabel} locale={locale}/>}
    <p className="purchase-stock-notice">{copy.stockNotice}</p>
  </div>;
}
