import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, Info, LockKeyhole, MessageCircle, PackageCheck, Phone, Truck } from "lucide-react";

import { ProductCard } from "@/components/storefront/product-card";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductOptions } from "@/components/storefront/product-options";
import { commerceCopy } from "@/lib/i18n/commerce";
import { publicSpecifications } from "@/lib/catalog/product-options";
import { getProductBySlug, getProductSlugRedirect } from "@/features/catalog/queries";
import { getBrandLogoPath } from "@/lib/catalog/brand-logos";
import { storeConfig } from "@/lib/config/store";
import { productConfirmationWhatsAppUrl } from "@/lib/contact/whatsapp";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatLkr } from "@/lib/pricing/money";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = requireLocale(rawLocale);
  const result = await getProductBySlug(slug, locale);
  if (!result) return { title: "Product not found" };
  return {
    title: result.product.name,
    description: result.product.shortDescription ?? result.product.description ?? undefined,
    alternates: { canonical: `/${locale}/products/${slug}`, languages: { en: `/en/products/${slug}`, si: `/si/products/${slug}`, ta: `/ta/products/${slug}` } },
    openGraph: { title: result.product.name, description: result.product.shortDescription ?? undefined, images: result.product.images[0]?.url ? [result.product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = requireLocale(rawLocale);
  const d = getDictionary(locale);
  const result = await getProductBySlug(slug, locale);
  if (!result) {
    const moved = await getProductSlugRedirect(slug);
    if (moved) redirect(`/${locale}/products/${moved.toSlug}`);
    notFound();
  }
  const { product, related, sizes } = result;
  const commerce = commerceCopy(locale);
  const brandLogo = getBrandLogoPath(product.brand?.slug);
  const priceLocale = locale === "en" ? "en-LK" : `${locale}-LK`;
  const hasPrice = product.priceMinor > 0n;
  const packSize = Object.entries(product.technicalSpecs ?? {}).find(([key, value]) => /pack|volume|size/i.test(key) && (typeof value === "string" || typeof value === "number"))?.[1]?.toString() ?? product.name.match(/\b\d+(?:\.\d+)?\s*(?:ml|l|lt|kg|g)\b/i)?.[0] ?? null;
  const whatsappHref = productConfirmationWhatsAppUrl({ name: product.name, brand: product.brand?.name, packSize });
  const discounted = hasPrice && product.priceMinor < product.standardPriceMinor;
  const priceLabel = product.priceSource === "LOYALTY" ? d.common.memberPrice : product.priceSource === "PROMOTION" ? d.common.promotionPrice : null;
  const specs = publicSpecifications(product.technicalSpecs);
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, image: product.images.map((item) => item.url), description: product.shortDescription, ...(hasPrice ? { offers: { "@type": "Offer", priceCurrency: product.currency, price: Number(product.priceMinor) / 100, availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } } : {}) };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}/>
    <div className="site-container py-8"><Link href={`/${locale}/products`} className="text-link"><ArrowLeft size={16}/>{d.nav.shop}</Link></div>
    <section className="site-container grid gap-10 pb-16 lg:grid-cols-[1.1fr_.9fr]">
      <ProductGallery images={product.images} fallbackLogo={brandLogo} fallbackName={product.brand?.name ?? product.category.name}/>
      <div className="self-center"><p className="eyebrow">{product.brand?.name ?? product.category.name}</p><h1 className="mt-3 font-display text-5xl leading-[1.02] tracking-[-.035em] sm:text-6xl">{product.name}</h1><p className="mt-3 text-slate-600">{product.shortDescription}</p><div className="mt-5 flex flex-wrap gap-4 border-y py-4 text-sm text-slate-600"><span className="flex items-center gap-2"><CheckCircle2 size={16}/>{product.category.name}</span>{packSize && <span className="flex items-center gap-2"><PackageCheck size={16}/>{packSize}</span>}</div><div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">{hasPrice ? <p className="font-display text-4xl text-[var(--store-accent)]">{d.common.from} {formatLkr(product.priceMinor, priceLocale)}</p> : <p className="font-display text-3xl text-[var(--store-accent)]">Price on Request · {product.inStock ? "Live Stock Available" : "Confirm Stock"}</p>}{discounted && <p className="text-sm text-slate-500 line-through">{d.common.standardPrice} {formatLkr(product.standardPriceMinor, priceLocale)}</p>}{priceLabel && <span className="w-full text-xs font-bold uppercase tracking-[.13em] text-[var(--store-accent)]">{priceLabel}</span>}</div><p className="price-change-notice">{commerce.priceNotice}</p><p className={`mt-3 text-sm font-medium ${product.inStock ? "text-emerald-700" : "text-red-700"}`}><span className="mr-2 inline-block h-2 w-2 rounded-full bg-current"/>{product.inStock ? `${d.common.stock} · ${product.available}` : d.common.unavailable}</p>
        <ProductOptions variants={product.variants} sizes={sizes} slug={product.slug} locale={locale} addLabel={d.common.add} loose={product.type === "LOOSE_OIL"}/>
        {!hasPrice ? <div className="product-detail-confirm-actions">
          <a className="product-confirm-button product-confirm-call" href={`tel:${storeConfig.phone.replace(/\s/g, "")}`}><Phone size={17}/><span>{d.common.contactStore}</span></a>
          <a className="product-confirm-button product-confirm-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={18}/><span>{d.common.whatsappConfirm}</span></a>
        </div> : null}
        <div className="mt-5 flex flex-wrap gap-3"><Link className="button-secondary" href={`/${locale}/requests?kind=quote&product=${product.slug}`}>{commerce.requestQuote}</Link>{product.acceptsPreOrders && <Link className="button-secondary" href={`/${locale}/requests?kind=preorder&product=${product.slug}`}>{commerce.preorder}</Link>}</div>
        <div className="product-trust-badges" aria-label="Purchase assurances"><div><BadgeCheck/><span><strong>Genuine-product assurance</strong><small>Supplier-traceable catalogue stock</small></span></div><div><LockKeyhole/><span><strong>Secure order handling</strong><small>Customer details stay protected</small></span></div><div><Clock3/><span><strong>Same-day Dehiwala dispatch</strong><small>Subject to stock and cutoff confirmation</small></span></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="service-card"><PackageCheck size={20}/><div><strong>{d.footer.pickup}</strong><p>{d.footer.pickupBody}</p></div></div><div className="service-card"><Truck size={20}/><div><strong>{d.footer.delivery}</strong><p>{d.footer.deliveryBody}</p></div></div></div>
        {product.usedFallback && <p className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Info className="shrink-0" size={18}/>{d.product.fallback}</p>}
      </div>
    </section>
    <section className="site-container grid gap-6 pb-16 lg:grid-cols-2"><article className="detail-panel"><h2>{d.product.details}</h2><p className="mt-4 leading-7 text-slate-600">{product.description}</p>{product.manufacturerUrl && <a className="text-link mt-4" href={product.manufacturerUrl} target="_blank" rel="noreferrer">Manufacturer product information</a>}</article><article className="detail-panel"><h2>{d.product.specifications}</h2>{specs.length ? <dl className="mt-4 divide-y">{specs.map(([key, value]) => <div className="flex justify-between gap-6 py-3 text-sm" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="text-right font-medium">{String(value)}</dd></div>)}</dl> : <p className="mt-4 text-muted-foreground">—</p>}</article></section>
    {related.length > 0 && <section className="bg-[#f3efe6] py-20"><div className="site-container"><div className="section-heading"><div><p className="eyebrow">You may also like</p><h2>{d.product.related}</h2></div><Link href={`/${locale}/products`} className="text-link">{d.home.allProducts}</Link></div><div className="product-grid">{related.slice(0,4).map((item) => <ProductCard key={item.id} product={item} locale={locale} dictionary={d}/>)}</div></div></section>}
  </>;
}
