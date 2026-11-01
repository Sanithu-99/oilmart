import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/storefront/product-card";
import { getHomepageData } from "@/features/catalog/queries";
import { storeConfig } from "@/lib/config/store";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = { title: "Premium automotive lubricants in Sri Lanka" };

const categoryShowcase: Record<string, { image: string; product: string }> = {
  "engine-oils": {
    image: "/images/products/inventory/caltex-prods-5w30.webp",
    product: "Caltex Havoline ProDS ECO5 5W-30",
  },
  "diesel-engine-oils": {
    image: "/images/products/inventory/caltex-delo-gold-ultra.webp",
    product: "Caltex Delo Gold Ultra 15W-40",
  },
  "motorcycle-oils": {
    image: "/images/products/inventory/caltex-havoline-super-4t.webp",
    product: "Caltex Havoline Super 4T",
  },
  "transmission-fluids": {
    image: "/images/products/inventory/valvoline-maxlife-atf.webp",
    product: "Valvoline MaxLife ATF",
  },
  "gear-oils": {
    image: "/images/products/inventory/caltex-delo-gear-ep5.webp",
    product: "Caltex Delo Gear EP5 80W-90",
  },
};

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const d = getDictionary(locale);
  const data = await getHomepageData(locale);
  const heroParts = data.hero?.title?.split("|").map((part) => part.trim()) ?? [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutomotiveBusiness",
    name: storeConfig.name,
    telephone: storeConfig.phone,
    address: { "@type": "PostalAddress", streetAddress: `${storeConfig.address.line1}, ${storeConfig.address.line2}`, addressLocality: storeConfig.address.city, postalCode: storeConfig.address.postalCode, addressCountry: "LK" },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}/>
    <section className="hero-market"><div className="site-container hero-market-grid">
      <section className="hero-section">
        <Image src="/images/storefront/hero-lubricants.png" alt="Brand-neutral lubricant bottle and amber oil on a sunlit stone plinth" fill priority sizes="(max-width: 1023px) 100vw, 72vw" className="hero-image"/>
        <div className="hero-wash"/>
        <div className="hero-content relative z-10 flex min-h-[560px] items-center px-8 py-14 lg:min-h-[560px] xl:px-14">
          <div className="max-w-3xl"><p className="eyebrow">{d.home.eyebrow}</p><h1 className="hero-title"><span>{heroParts[0] ?? d.home.titleA}</span><em>{heroParts[1] ?? (data.hero?.title && heroParts.length === 1 ? "" : d.home.titleB)}</em></h1><p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">{data.hero?.body ?? d.home.body}</p><div className="mt-9 flex flex-wrap gap-3"><Link className="button-primary" href={`/${locale}/products`}>{d.home.primary}<ArrowRight size={17}/></Link><Link className="button-secondary" href={`/${locale}/products?category=loose-oils`}>{d.home.secondary}<ArrowRight size={17}/></Link></div></div>
        </div>
      </section>
      <aside className="hero-side-stack" aria-label="Store services">
        <article className="hero-info-card hero-info-card-blue"><span>01 / Store</span><h2>{d.footer.store}</h2><address>{storeConfig.address.line1}, {storeConfig.address.line2}<br/>{storeConfig.address.city}</address><a href={`tel:${storeConfig.phone.replace(/\s/g, "")}`}>{storeConfig.phone}</a></article>
        <article className="hero-info-card hero-info-card-yellow"><span>02 / Pickup</span><h2>{d.footer.pickup}</h2><p>{d.footer.pickupBody}</p><Link href={`/${locale}/products`}>{d.footer.pickupAction}<ArrowRight size={16}/></Link></article>
      </aside>
    </div></section>

    <section className="category-market"><div className="site-container">
      <div className="category-market-heading"><div><p className="eyebrow">{d.home.categoryEyebrow}</p><h2>{d.home.categories}</h2></div><p>{d.home.categoryBody}</p></div>
      <div className="category-market-grid">{data.categories.slice(0,5).map((category, index) => {
        const showcase = categoryShowcase[category.slug] ?? { image: "/images/products/inventory/caltex-prods-5w30.webp", product: category.name };
        return <Link href={`/${locale}/products?category=${category.slug}`} key={category.slug} className={`category-market-card category-market-card-${index + 1}`}>
          <div className="category-market-art">
            <span className="category-market-number">{String(index + 1).padStart(2,"0")}</span>
            <Image src={showcase.image} alt={showcase.product} fill sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 45vw, 20vw" className="category-market-product"/>
            <span className="category-market-product-name">{showcase.product}</span>
          </div>
          <div className="category-market-copy"><div><h3>{category.name}</h3><p>{category.description ?? d.home.browseProducts}</p></div><span className="category-market-arrow"><ArrowRight aria-hidden="true" size={19}/></span></div>
        </Link>;
      })}</div>
    </div></section>

    {data.brands.length > 0 && <section className="site-container pb-6" id="brands"><div className="section-heading"><div><p className="eyebrow">Catalogue</p><h2>{d.home.brands}</h2></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{data.brands.map((brand) => <Link className="brand-tile" href={`/${locale}/products?brand=${brand.slug}`} key={brand.slug}>{brand.logoUrl ? <Image src={brand.logoUrl} alt={brand.name} width={150} height={60}/> : <span>{brand.name}</span>}</Link>)}</div></section>}

    <section className="site-container section-space"><div className="section-heading"><div><p className="eyebrow">Curated selection</p><h2>{d.home.featured}</h2></div><Link href={`/${locale}/products`} className="text-link">{d.home.allProducts}<ArrowRight size={16}/></Link></div><div className="product-grid">{data.featured.map((product) => <ProductCard key={product.id} product={product} locale={locale} dictionary={d}/>)}</div></section>

    <section className="bg-[#eaf0fa] py-20"><div className="site-container"><div className="section-heading"><div><p className="eyebrow">Recently added</p><h2>{d.home.arrivals}</h2></div><Link href={`/${locale}/products?sort=newest`} className="text-link">{d.home.allProducts}<ArrowRight size={16}/></Link></div><div className="product-grid">{data.newArrivals.map((product) => <ProductCard key={product.id} product={product} locale={locale} dictionary={d}/>)}</div></div></section>

    {data.promotion && <section className="site-container section-space" id="offers"><div className="rounded-3xl border-b-4 border-[#ffd11a] bg-[#142d79] p-9 text-white"><p className="eyebrow text-[#ffd11a]">{d.nav.offers}</p><h2 className="font-display text-4xl">{data.promotion.name}</h2>{data.promotion.description && <p className="mt-3 max-w-2xl text-[#d9e4ff]">{data.promotion.description}</p>}</div></section>}
  </>;
}
