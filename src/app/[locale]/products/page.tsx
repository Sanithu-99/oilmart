import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

import { ProductCard } from "@/components/storefront/product-card";
import { getCatalog, type CatalogFilters } from "@/features/catalog/queries";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return { title: "Shop automotive lubricants", description: "Search and filter the Saranankara Oil Mart product catalogue.", alternates: { canonical: `/${locale}/products`, languages: { en: "/en/products", si: "/si/products", ta: "/ta/products" } } };
}

function queryHref(locale: string, current: SearchParams, updates: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) { const item = first(value); if (item) query.set(key, item); }
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") query.delete(key);
    else query.set(key, String(value));
  }
  const suffix = query.toString();
  return `/${locale}/products${suffix ? `?${suffix}` : ""}`;
}

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const locale = requireLocale((await params).locale);
  const query = await searchParams;
  const d = getDictionary(locale);
  const filters: CatalogFilters = {
    q: first(query.q)?.trim() || undefined,
    category: first(query.category) || undefined,
    brand: first(query.brand) || undefined,
    application: first(query.application) || undefined,
    availability: ["in", "out"].includes(first(query.availability) ?? "") ? first(query.availability) as "in" | "out" : undefined,
    sort: ["newest", "price-asc", "price-desc"].includes(first(query.sort) ?? "") ? first(query.sort) as CatalogFilters["sort"] : "newest",
    page: Number(first(query.page)) || 1,
  };
  const data = await getCatalog(locale, filters);
  return <>
    <section className="catalog-hero"><div className="site-container py-16 lg:py-20"><p className="eyebrow">{d.catalog.eyebrow}</p><h1 className="mt-3 max-w-3xl font-display text-5xl leading-[.98] tracking-[-.035em] sm:text-7xl">{d.catalog.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{d.catalog.body}</p></div></section>
    <section className="site-container py-10">
      <form action={`/${locale}/products`} className="filter-panel" id="catalog-filters">
        <label className="search-field flex-1"><Search size={18}/><input name="q" defaultValue={filters.q} placeholder={d.catalog.search}/></label>
        <label className="select-field"><span className="sr-only">{d.catalog.category}</span><select name="category" defaultValue={filters.category ?? ""}><option value="">{d.catalog.category}</option>{data.categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
        <label className="select-field"><span className="sr-only">{d.catalog.brand}</span><select name="brand" defaultValue={filters.brand ?? ""}><option value="">{d.catalog.brand}</option>{data.brands.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}</select></label>
        <label className="select-field"><span className="sr-only">{d.catalog.application}</span><select name="application" defaultValue={filters.application ?? ""}><option value="">{d.catalog.application}</option>{data.applications.map((application) => <option key={application.slug} value={application.slug}>{application.name}</option>)}</select></label>
        <label className="select-field"><span className="sr-only">{d.catalog.availability}</span><select name="availability" defaultValue={filters.availability ?? ""}><option value="">{d.catalog.availability}</option><option value="in">{d.catalog.inStock}</option><option value="out">{d.catalog.outOfStock}</option></select></label>
        <label className="select-field"><SlidersHorizontal size={16}/><select name="sort" defaultValue={filters.sort}><option value="newest">{d.catalog.sort}</option><option value="price-asc">{d.catalog.priceLow}</option><option value="price-desc">{d.catalog.priceHigh}</option></select></label>
        <button className="button-primary" type="submit">{d.nav.search}</button>
      </form>
      <div className="my-8 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{data.total}</strong> {d.catalog.results}</p>{Object.values(filters).some((value) => value && value !== 1 && value !== "newest") && <Link href={`/${locale}/products`} className="text-link"><X size={15}/>{d.catalog.clear}</Link>}</div>
      {data.products.length ? <div className="product-grid">{data.products.map((product) => <ProductCard key={product.id} product={product} locale={locale} dictionary={d}/>)}</div> : <div className="empty-state"><Search size={32}/><p>{d.catalog.empty}</p></div>}
      {data.pageCount > 1 && <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Pagination"><Link aria-disabled={data.page <= 1} className={`pagination-button ${data.page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={queryHref(locale, query, { page: data.page - 1 })}><ChevronLeft size={16}/>{d.common.previous}</Link><span className="text-sm">{d.common.page} {data.page} / {data.pageCount}</span><Link aria-disabled={data.page >= data.pageCount} className={`pagination-button ${data.page >= data.pageCount ? "pointer-events-none opacity-40" : ""}`} href={queryHref(locale, query, { page: data.page + 1 })}>{d.common.next}<ChevronRight size={16}/></Link></nav>}
    </section>
  </>;
}
