import Image from "next/image";
import Link from "next/link";

import { getBrandLogoPath } from "@/lib/catalog/brand-logos";
import type { StoreLocale } from "@/lib/i18n/config";

type Brand = { slug: string; name: string; logoUrl: string | null };

function BrandLink({ brand, locale, duplicate = false }: { brand: Brand; locale: StoreLocale; duplicate?: boolean }) {
  const logo = getBrandLogoPath(brand.slug, brand.logoUrl);
  return <Link
    className="brand-logo-card"
    href={`/${locale}/products?brand=${brand.slug}`}
    aria-label={duplicate ? undefined : `Shop ${brand.name} products`}
    tabIndex={duplicate ? -1 : undefined}
  >
    {logo
      ? <Image src={logo} alt={duplicate ? "" : brand.name} width={170} height={64} sizes="170px" unoptimized/>
      : <span>{brand.name}</span>}
  </Link>;
}

function BrandRow({ brands, locale, reverse = false }: { brands: Brand[]; locale: StoreLocale; reverse?: boolean }) {
  return <div className={`brand-marquee-row${reverse ? " reverse" : ""}`}>
    <div className="brand-marquee-track">
      <div className="brand-marquee-group">{brands.map((brand) => <BrandLink brand={brand} locale={locale} key={brand.slug}/>)}</div>
      <div className="brand-marquee-group" aria-hidden="true">{brands.map((brand) => <BrandLink brand={brand} locale={locale} duplicate key={`${brand.slug}-duplicate`}/>)}</div>
    </div>
  </div>;
}

export function BrandLogoWall({ brands, locale }: { brands: Brand[]; locale: StoreLocale }) {
  const splitAt = Math.ceil(brands.length / 2);
  const firstRow = brands.slice(0, splitAt);
  const secondRow = brands.slice(splitAt).reverse();

  return <div className="brand-marquee" aria-label="Available brands">
    <BrandRow brands={firstRow} locale={locale}/>
    <BrandRow brands={secondRow} locale={locale} reverse/>
  </div>;
}
