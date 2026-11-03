import Link from "next/link";
import { ChevronDown, Droplet, MapPin, Menu, Phone, Search, UserRound } from "lucide-react";

import { storeConfig } from "@/lib/config/store";
import type { StoreLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { CartButton } from "./cart-provider";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({ locale, dictionary }: { locale: StoreLocale; dictionary: Dictionary }) {
  const nav = [
    [dictionary.nav.shop, `/${locale}/products`],
    [dictionary.nav.categories, `/${locale}/products#catalog-filters`],
    [dictionary.nav.brands, `/${locale}#brands`],
    [dictionary.nav.offers, `/${locale}#offers`],
    [dictionary.nav.about, `/${locale}#about`],
    [dictionary.nav.contact, `/${locale}#contact`],
  ];
  return <header className="site-header">
    <div className="market-topbar"><div className="site-container"><span className="market-topbar-message">Quality lubricants for Sri Lanka</span><div className="header-utility-links"><a href={`tel:${storeConfig.phone.replace(/\s/g, "")}`}><Phone size={13}/><span>{storeConfig.phone}</span></a><a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={13}/><span>Hill St, Dehiwala</span></a></div><nav className="header-language-links" aria-label="Language selector"><LanguageSwitcher locale={locale}/></nav></div></div>
    <div className="site-container header-main-row flex h-20 items-center gap-4 lg:h-24">
      <Link href={`/${locale}`} className="brand-lockup shrink-0" aria-label="Saranankara Oil Mart home"><span className="brand-mark"><Droplet size={30} strokeWidth={1.8}/></span><span><strong>Saranankara</strong><small>Oil Mart</small></span></Link>
      <form action={`/${locale}/products`} className="ml-8 hidden max-w-xl flex-1 lg:flex xl:ml-16"><label className="search-field header-search-field w-full"><input name="q" placeholder={dictionary.nav.search} aria-label={dictionary.nav.search}/><button className="header-search-button" type="submit" aria-label={dictionary.nav.search}><Search size={19}/></button></label></form>
      <span className="ml-auto"/>
      <Link className="icon-button hidden sm:grid" href={`/${locale}/account`} aria-label="Account"><UserRound size={21}/></Link>
      <CartButton />
      <details className="mobile-menu lg:hidden"><summary className="icon-button list-none"><Menu size={22}/><span className="sr-only">{dictionary.nav.menu}</span></summary><div className="mobile-menu-panel fixed left-3 right-3 top-[6.5rem] rounded-2xl border p-4 shadow-xl"><form action={`/${locale}/products`}><label className="search-field header-search-field"><input name="q" placeholder={dictionary.nav.search}/><button className="header-search-button" type="submit" aria-label={dictionary.nav.search}><Search size={18}/></button></label></form><nav className="mt-3 grid">{nav.map(([label, href]) => <Link className="border-b px-2 py-3" href={href} key={href}>{label}</Link>)}</nav><div className="mt-4 flex flex-wrap items-center gap-2"><LanguageSwitcher locale={locale} compact/></div></div></details>
    </div>
    <div className="header-nav-row hidden lg:block"><div className="site-container flex h-14 items-center justify-center gap-10"><nav className="flex items-center gap-9" aria-label="Primary navigation">{nav.map(([label, href], index) => <Link className={`nav-link ${index === 0 ? "active" : ""}`} href={href} key={href}>{label}{index === 1 && <ChevronDown size={14}/>}</Link>)}</nav></div></div>
  </header>;
}
