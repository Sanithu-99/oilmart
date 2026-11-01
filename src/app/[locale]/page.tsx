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
    image: "/images/storefront/categories/havoline-prods-eco.jpg",
    product: "Caltex Havoline ProDS Eco 5W-30",
  },
  "diesel-engine-oils": {
    image: "/images/storefront/categories/castrol-crb-turbomax.png",
    product: "Castrol CRB Turbomax 15W-40",
  },
  "motorcycle-oils": {
    image: "/images/storefront/categories/servo-4t-xtra.png",
    product: "SERVO 4T Xtra 20W-40",
  },
  "transmission-fluids": {
    image: "/images/storefront/categories/castrol-transmax.png",
    product: "Castrol Transmax CVT",
  },
  "gear-oils": {
    image: "/images/storefront/categories/shell-spirax-s2g.jpg",
    product: "Shell Spirax S2 G 80W-90",
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
    <section className="hero-section">
      <Image src="/images/storefront/hero-lubricants.png" alt="Brand-neutral lubricant bottle and amber oil on a sunlit stone plinth" fill priority sizes="100vw" className="hero-image"/>
      <div className="hero-wash"/>
      <div className="site-container relative z-10 flex min-h-[560px] items-center py-14 lg:min-h-[560px]">
        <div className="max-w-3xl"><p className="eyebrow">{d.home.eyebrow}</p><h1 className="hero-title"><span>{heroParts[0] ?? d.home.titleA}</span><em>{heroParts[1] ?? (data.hero?.title && heroParts.length === 1 ? "" : d.home.titleB)}</em></h1><p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">{data.hero?.body ?? d.home.body}</p><div className="mt-9 flex flex-wrap gap-3"><Link className="button-primary" href={`/${locale}/products`}>{d.home.primary}<ArrowRight size={17}/></Link><Link className="button-secondary" href={`/${locale}/products?category=loose-oils`}>{d.home.secondary}<ArrowRight size={17}/></Link></div></div>
      </div>
    </section>

    <section className="category-market"><div className="site-container">
      <div className="category-market-heading"><div><p className="eyebrow">{d.home.categoryEyebrow}</p><h2>{d.home.categories}</h2></div><p>{d.home.categoryBody}</p></div>
      <div className="category-market-grid">{data.categories.slice(0,5).map((category, index) => {
        const showcase = categoryShowcase[category.slug] ?? { image: "/images/storefront/sample-lubricant.png", product: category.name };
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

    <section className="bg-[#e9ece4] py-20"><div className="site-container"><div className="section-heading"><div><p className="eyebrow">Recently added</p><h2>{d.home.arrivals}</h2></div><Link href={`/${locale}/products?sort=newest`} className="text-link">{d.home.allProducts}<ArrowRight size={16}/></Link></div><div className="product-grid">{data.newArrivals.map((product) => <ProductCard key={product.id} product={product} locale={locale} dictionary={d}/>)}</div></div></section>

    {data.promotion && <section className="site-container section-space" id="offers"><div className="rounded-3xl bg-[#103b32] p-9 text-white"><p className="eyebrow text-[#d5b762]">{d.nav.offers}</p><h2 className="font-display text-4xl">{data.promotion.name}</h2>{data.promotion.description && <p className="mt-3 max-w-2xl text-[#d7e2dc]">{data.promotion.description}</p>}</div></section>}
  </>;
}
