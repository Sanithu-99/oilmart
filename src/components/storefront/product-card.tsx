import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import type { StoreProduct } from "@/features/catalog/queries";
import { getBrandLogoPath } from "@/lib/catalog/brand-logos";
import { formatLkr } from "@/lib/pricing/money";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { StoreLocale } from "@/lib/i18n/config";
import { productConfirmationWhatsAppUrl } from "@/lib/contact/whatsapp";
import { AddToCart } from "./add-to-cart";

export function ProductCard({ product, locale, dictionary }: { product: StoreProduct; locale: StoreLocale; dictionary: Dictionary }) {
  const image = product.images[0];
  const brandLogo = getBrandLogoPath(product.brand?.slug);
  const priceLocale = locale === "en" ? "en-LK" : `${locale}-LK`;
  const hasPrice = product.priceMinor > 0n;
  const packSize = Object.entries(product.technicalSpecs ?? {}).find(([key, value]) => /pack|volume|size/i.test(key) && (typeof value === "string" || typeof value === "number"))?.[1]?.toString() ?? product.name.match(/\b\d+(?:\.\d+)?\s*(?:ml|l|lt|kg|g)\b/i)?.[0] ?? null;
  const whatsappHref = productConfirmationWhatsAppUrl({ name: product.name, sku: product.sku, brand: product.brand?.name, packSize });
  const discounted = hasPrice && product.priceMinor < product.standardPriceMinor;
  const priceLabel = product.priceSource === "LOYALTY" ? dictionary.common.memberPrice : product.priceSource === "PROMOTION" ? dictionary.common.promotionPrice : null;
  return <article className="product-card group">
    <Link href={`/${locale}/products/${product.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-[#f6f2e9]">
        {image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 24vw" className="object-contain p-1.5 transition duration-500 group-hover:scale-[1.05]" /> : <div className="product-brand-fallback">{brandLogo ? <Image src={brandLogo} alt={`${product.brand?.name ?? product.category.name} logo`} fill sizes="(max-width: 640px) 70vw, (max-width: 1024px) 32vw, 16vw" unoptimized className="product-brand-fallback-logo"/> : <span>{product.brand?.name ?? product.category.name}</span>}</div>}
      </div>
      <div className="pt-4"><p className="text-xs font-semibold uppercase tracking-[.13em] text-[var(--store-accent)]">{product.brand?.name ?? product.category.name}</p><h3 className="mt-1.5 font-display text-xl leading-tight text-slate-950 group-hover:text-[var(--store-accent)]">{product.name}</h3><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{product.shortDescription}</p><div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">{hasPrice ? <p className="font-semibold text-[var(--store-accent)]">{dictionary.common.from} {formatLkr(product.priceMinor, priceLocale)}</p> : <p className="font-semibold text-[var(--store-accent)]">Price on Request · {product.inStock ? "Live Stock Available" : "Confirm Stock"}</p>}{discounted && <p className="text-xs text-slate-500 line-through">{formatLkr(product.standardPriceMinor, priceLocale)}</p>}{priceLabel && <span className="w-full text-[10px] font-bold uppercase tracking-[.12em] text-[var(--store-accent)]">{priceLabel}</span>}</div><p className={`mt-1.5 text-xs font-medium ${product.inStock ? "text-emerald-700" : "text-red-700"}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current"/>{product.inStock ? dictionary.common.stock : dictionary.common.unavailable}</p></div>
    </Link>
    {hasPrice && <AddToCart className="mt-4" variantId={product.variant?.id} disabled={!product.inStock} label={dictionary.common.add}/>}<a className="product-confirm-button product-confirm-whatsapp mt-2 w-full" href={whatsappHref} target="_blank" rel="noreferrer" aria-label={`Inquire via WhatsApp: ${product.name}`}><MessageCircle size={16}/><span>Inquire via WhatsApp</span></a>
  </article>;
}
