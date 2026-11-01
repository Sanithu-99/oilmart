import Image from "next/image";
import Link from "next/link";

import type { StoreLocale } from "@/lib/i18n/config";

type Brand = { slug: string; name: string; logoUrl: string | null };

const localBrandLogos: Record<string, string> = {
  abro: "/images/brands/abro.svg",
  caltex: "/images/brands/caltex.svg",
  castrol: "/images/brands/castrol.svg",
  delphi: "/images/brands/delphi.svg",
  eurol: "/images/brands/eurol.webp",
  fuji: "/images/brands/fuji.webp",
  honda: "/images/brands/honda.svg",
  laugfs: "/images/brands/laugfs.webp",
  mag: "/images/brands/mag.webp",
  mitsubishi: "/images/brands/mitsubishi.svg",
  mobil: "/images/brands/mobil.svg",
  petromin: "/images/brands/petromin.webp",
  petrons: "/images/brands/petrons.svg",
  prestone: "/images/brands/prestone.webp",
  prime: "/images/brands/prime.svg",
  "pure-fast": "/images/brands/pure-fast.svg",
  "royal-super": "/images/brands/royal-super.webp",
  sakura: "/images/brands/sakura.webp",
  servo: "/images/brands/servo.webp",
  sinopec: "/images/brands/sinopec.webp",
  smash: "/images/brands/smash.svg",
  suzuki: "/images/brands/suzuki.svg",
  totachi: "/images/brands/totachi.webp",
  toyota: "/images/brands/toyota.svg",
  valvoline: "/images/brands/valvoline.svg",
  vic: "/images/brands/vic.webp",
  waxpol: "/images/brands/waxpol.webp",
  wurth: "/images/brands/wurth.svg",
};

function BrandLink({ brand, locale, duplicate = false }: { brand: Brand; locale: StoreLocale; duplicate?: boolean }) {
  const logo = localBrandLogos[brand.slug] ?? (brand.logoUrl?.startsWith("/") ? brand.logoUrl : null);
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
