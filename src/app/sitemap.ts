import type { MetadataRoute } from "next";

import { getSitemapProducts } from "@/features/catalog/queries";
import { resolveAppUrl } from "@/lib/config/app-url";
import { locales } from "@/lib/i18n/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveAppUrl();
  const products = await getSitemapProducts();
  const staticRoutes = locales.flatMap((locale) => [
    { url: `${base}/${locale}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: locale === "en" ? 1 : .8 },
    { url: `${base}/${locale}/products`, lastModified: new Date(), changeFrequency: "daily" as const, priority: .9 },
  ]);
  const productRoutes = products.flatMap((product) => locales.map((locale) => ({ url: `${base}/${locale}/products/${product.slug}`, lastModified: product.updatedAt, changeFrequency: "weekly" as const, priority: .7 })));
  return [...staticRoutes, ...productRoutes];
}
