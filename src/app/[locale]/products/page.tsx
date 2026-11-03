import type { Metadata } from "next";

import { CatalogExperience } from "@/components/storefront/catalog-experience";
import { getCatalogExperienceData } from "@/features/catalog/queries";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: "Shop automotive lubricants",
    description: "Instantly search and filter the live Saranankara Oil Mart product catalogue.",
    alternates: { canonical: `/${locale}/products`, languages: { en: "/en/products", si: "/si/products", ta: "/ta/products" } },
  };
}

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const locale = requireLocale((await params).locale);
  const query = await searchParams;
  const dictionary = getDictionary(locale);
  const catalog = await getCatalogExperienceData(locale);

  return <CatalogExperience
    products={catalog.products}
    brands={catalog.brands}
    locale={locale}
    dictionary={dictionary}
    syncUrl
    initialFilters={{
      q: first(query.q)?.trim(),
      category: first(query.category),
      brand: first(query.brand),
      vehicle: first(query.vehicle),
      application: first(query.application),
      grade: first(query.grade),
      availability: first(query.availability),
      sort: first(query.sort),
    }}
  />;
}
