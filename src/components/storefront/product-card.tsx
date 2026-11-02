import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";

import type { StoreProduct } from "@/features/catalog/queries";
import { formatLkr } from "@/lib/pricing/money";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { StoreLocale } from "@/lib/i18n/config";
import { storeConfig } from "@/lib/config/store";
import { productConfirmationWhatsAppUrl } from "@/lib/contact/whatsapp";
import { AddToCart } from "./add-to-cart";

export function ProductCard({ product, locale, dictionary }: { product: StoreProduct; locale: StoreLocale; dictionary: Dictionary }) {
  const image = product.images[0];
  const priceLocale = locale === "en" ? "en-LK" : `${locale}-LK`;
  const hasPrice = product.priceMinor > 0n;
  const whatsappHref = productConfirmationWhatsAppUrl({ name: product.name, sku: product.sku, brand: product.brand?.name });
  const discounted = hasPrice && product.priceMinor < product.standardPriceMinor;
  const priceLabel = product.priceSource === "LOYALTY" ? dictionary.common.memberPrice : product.priceSource === "PROMOTION" ? dictionary.common.promotionPrice : null;
  return <article className="product-card group">
    <Link href={`/${locale}/products/${product.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-[#f6f2e9]">
        {image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 24vw" className="object-contain p-1.5 transition duration-500 group-hover:scale-[1.05]" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f1ece3] to-white p-8 text-center"><span className="max-w-44 text-sm font-bold uppercase tracking-[.14em] text-[#17483b]">{product.brand?.name ?? product.category.name}</span></div>}
      </div>
      <div className="pt-4"><p className="text-xs font-semibold uppercase tracking-[.13em] text-[#1f6b55]">{product.brand?.name ?? product.category.name}</p><h3 className="mt-1.5 font-display text-xl leading-tight text-slate-950 group-hover:text-[#1f6b55]">{product.name}</h3><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{product.shortDescription}</p><div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">{hasPrice ? <p className="font-semibold text-[#1f6b55]">{formatLkr(product.priceMinor, priceLocale)}</p> : <p className="font-semibold text-[#1f6b55]">{dictionary.common.contactForPrice}</p>}{discounted && <p className="text-xs text-slate-500 line-through">{formatLkr(product.standardPriceMinor, priceLocale)}</p>}{priceLabel && <span className="w-full text-[10px] font-bold uppercase tracking-[.12em] text-[#1f6b55]">{priceLabel}</span>}</div><p className={`mt-1.5 text-xs font-medium ${product.inStock ? "text-emerald-700" : "text-red-700"}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current"/>{product.inStock ? dictionary.common.stock : dictionary.common.unavailable}</p></div>
    </Link>
    {hasPrice ? <AddToCart className="mt-4" variantId={product.variant?.id} disabled={!product.inStock} label={dictionary.common.add}/> : <div className="product-confirm-actions">
      <a className="product-confirm-button product-confirm-call" href={`tel:${storeConfig.phone.replace(/\s/g, "")}`} aria-label={`${dictionary.common.contactStore}: ${product.name}`}><Phone size={15}/><span>{dictionary.common.contactStore}</span></a>
      <a className="product-confirm-button product-confirm-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer" aria-label={`${dictionary.common.whatsappConfirm}: ${product.name}`}><MessageCircle size={16}/><span>{dictionary.common.whatsappConfirm}</span></a>
    </div>}
  </article>;
}
