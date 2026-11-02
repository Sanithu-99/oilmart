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

export function getBrandLogoPath(slug: string | null | undefined, logoUrl?: string | null) {
  if (slug && localBrandLogos[slug]) return localBrandLogos[slug];
  return logoUrl?.startsWith("/") ? logoUrl : null;
}
