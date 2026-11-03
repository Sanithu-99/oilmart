import type { Metadata } from "next";

import { CatalogExperience } from "@/components/storefront/catalog-experience";
import { getCatalogExperienceData, getHomepagePromotion } from "@/features/catalog/queries";
import { storeConfig } from "@/lib/config/store";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = { title: "Premium automotive lubricants in Sri Lanka" };

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const dictionary = getDictionary(locale);
  const [catalog, promotion] = await Promise.all([getCatalogExperienceData(locale), getHomepagePromotion()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutomotiveBusiness",
    name: storeConfig.name,
    telephone: storeConfig.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${storeConfig.address.line1}, ${storeConfig.address.line2}`,
      addressLocality: storeConfig.address.city,
      postalCode: storeConfig.address.postalCode,
      addressCountry: "LK",
    },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}/>
    <CatalogExperience products={catalog.products} brands={catalog.brands} locale={locale} dictionary={dictionary} showHero/>
    {promotion && <section className="automotive-offer" id="offers"><div className="site-container"><p>{dictionary.nav.offers}</p><h2>{promotion.name}</h2>{promotion.description && <span>{promotion.description}</span>}</div></section>}
  </>;
}
