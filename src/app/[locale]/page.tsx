import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Cog, Droplet, Gauge, Snowflake, Wrench } from "lucide-react";

import { ProductCard } from "@/components/storefront/product-card";
import { getHomepageData } from "@/features/catalog/queries";
import { storeConfig } from "@/lib/config/store";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = { title: "Premium automotive lubricants in Sri Lanka" };

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const d = getDictionary(locale);
  const data = await getHomepageData(locale);
  const heroParts = data.hero?.title?.split("|").map((part) => part.trim()) ?? [];
  const categoryIcons = [Gauge, Cog, Wrench, Droplet, Snowflake];
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

    <section className="border-y bg-[#fffdf8]"><div className="site-container grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0 lg:grid-cols-5">
      {data.categories.slice(0,5).map((category, index) => { const Icon = categoryIcons[index] ?? Droplet; return <Link href={`/${locale}/products?category=${category.slug}`} key={category.slug} className="category-link"><span className="category-icon"><Icon size={22}/></span><h2>{category.name}</h2><p>{category.description ?? "Browse available products"}</p><ArrowRight className="mt-4 text-amber-700" size={18}/></Link>; })}
    </div></section>

    <section className="site-container section-space" id="about"><div className="rounded-2xl border border-amber-200 bg-[#fff8e9] px-6 py-5 sm:flex sm:items-center sm:justify-between"><div><p className="font-semibold text-amber-900">{d.home.demo}</p><p className="mt-1 max-w-4xl text-sm leading-6 text-amber-900/75">{d.home.demoBody}</p></div><BadgeCheck className="mt-4 shrink-0 text-amber-700 sm:mt-0" size={27}/></div></section>

    {data.brands.length > 0 && <section className="site-container pb-6" id="brands"><div className="section-heading"><div><p className="eyebrow">Catalogue</p><h2>{d.home.brands}</h2></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{data.brands.map((brand) => <Link className="brand-tile" href={`/${locale}/products?brand=${brand.slug}`} key={brand.slug}>{brand.logoUrl ? <Image src={brand.logoUrl} alt={brand.name} width={150} height={60}/> : <span>{brand.name}</span>}</Link>)}</div></section>}

    <section className="site-container section-space"><div className="section-heading"><div><p className="eyebrow">Curated selection</p><h2>{d.home.featured}</h2></div><Link href={`/${locale}/products`} className="text-link">{d.home.allProducts}<ArrowRight size={16}/></Link></div><div className="product-grid">{data.featured.map((product) => <ProductCard key={product.id} product={product} locale={locale} dictionary={d}/>)}</div></section>

    <section className="bg-[#f3efe6] py-20"><div className="site-container"><div className="section-heading"><div><p className="eyebrow">Recently added</p><h2>{d.home.arrivals}</h2></div><Link href={`/${locale}/products?sort=newest`} className="text-link">{d.home.allProducts}<ArrowRight size={16}/></Link></div><div className="product-grid">{data.newArrivals.map((product) => <ProductCard key={product.id} product={product} locale={locale} dictionary={d}/>)}</div></div></section>

    {data.promotion && <section className="site-container section-space" id="offers"><div className="rounded-3xl bg-slate-950 p-9 text-white"><p className="eyebrow text-amber-400">{d.nav.offers}</p><h2 className="font-display text-4xl">{data.promotion.name}</h2>{data.promotion.description && <p className="mt-3 max-w-2xl text-slate-300">{data.promotion.description}</p>}</div></section>}
  </>;
}
