import Image from "next/image";
import Link from "next/link";

import type { StoreProduct } from "@/features/catalog/queries";
import { formatLkr } from "@/lib/pricing/money";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { StoreLocale } from "@/lib/i18n/config";
import { AddToCart } from "./add-to-cart";

export function ProductCard({ product, locale, dictionary }: { product: StoreProduct; locale: StoreLocale; dictionary: Dictionary }) {
  const image = product.images[0];
  const priceLocale = locale === "en" ? "en-LK" : `${locale}-LK`;
  const discounted = product.priceMinor < product.standardPriceMinor;
  const priceLabel = product.priceSource === "LOYALTY" ? dictionary.common.memberPrice : product.priceSource === "PROMOTION" ? dictionary.common.promotionPrice : null;
  return <article className="product-card group">
    <Link href={`/${locale}/products/${product.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-[#f2eee5]">
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#fff8ea] px-2.5 py-1 text-[11px] font-semibold text-amber-800">{dictionary.common.sample}</span>
        {image && <Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 24vw" className="object-contain p-5 transition duration-500 group-hover:scale-[1.04]" />}
      </div>
      <div className="pt-4"><p className="text-xs font-semibold uppercase tracking-[.13em] text-amber-700">{product.brand?.name ?? product.category.name}</p><h3 className="mt-1.5 font-display text-xl leading-tight text-slate-950 group-hover:text-amber-700">{product.name}</h3><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{product.shortDescription}</p><div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="font-semibold text-amber-700">{formatLkr(product.priceMinor, priceLocale)}</p>{discounted && <p className="text-xs text-slate-500 line-through">{formatLkr(product.standardPriceMinor, priceLocale)}</p>}{priceLabel && <span className="w-full text-[10px] font-bold uppercase tracking-[.12em] text-amber-800">{priceLabel}</span>}</div><p className={`mt-1.5 text-xs font-medium ${product.inStock ? "text-emerald-700" : "text-red-700"}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current"/>{product.inStock ? dictionary.common.stock : dictionary.common.unavailable}</p></div>
    </Link>
    <AddToCart className="mt-4" variantId={product.variant?.id} disabled={!product.inStock} label={dictionary.common.add}/>
  </article>;
}
