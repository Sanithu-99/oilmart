import Link from "next/link";
import { ChevronDown, Droplet, Menu, Search, UserRound } from "lucide-react";

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
    <div className="site-container flex h-20 items-center gap-4 lg:h-24">
      <Link href={`/${locale}`} className="brand-lockup shrink-0" aria-label="Saranankara Oil Mart home"><span className="brand-mark"><Droplet size={30} strokeWidth={1.8}/></span><span><strong>Saranankara</strong><small>Oil Mart</small></span></Link>
      <form action={`/${locale}/products`} className="ml-8 hidden max-w-xl flex-1 lg:flex xl:ml-16"><label className="search-field w-full"><Search size={18}/><input name="q" placeholder={dictionary.nav.search} aria-label={dictionary.nav.search}/></label></form>
      <nav className="ml-auto hidden items-center gap-1 xl:flex" aria-label="Language selector">
        <LanguageSwitcher locale={locale}/>
      </nav>
      <Link className="icon-button hidden sm:grid" href={`/${locale}/account`} aria-label="Account"><UserRound size={21}/></Link>
      <CartButton />
      <details className="mobile-menu lg:hidden"><summary className="icon-button list-none"><Menu size={22}/><span className="sr-only">{dictionary.nav.menu}</span></summary><div className="fixed left-3 right-3 top-[4.5rem] rounded-2xl border bg-[#fffdf8] p-4 shadow-xl"><form action={`/${locale}/products`}><label className="search-field"><Search size={18}/><input name="q" placeholder={dictionary.nav.search}/></label></form><nav className="mt-3 grid">{nav.map(([label, href]) => <Link className="border-b px-2 py-3" href={href} key={href}>{label}</Link>)}</nav><div className="mt-4 flex gap-2"><LanguageSwitcher locale={locale} compact/></div></div></details>
    </div>
    <div className="hidden border-t border-black/5 lg:block"><div className="site-container flex h-14 items-center justify-center gap-10"><nav className="flex items-center gap-9" aria-label="Primary navigation">{nav.map(([label, href], index) => <Link className={`nav-link ${index === 0 ? "active" : ""}`} href={href} key={href}>{label}{index === 1 && <ChevronDown size={14}/>}</Link>)}</nav></div></div>
  </header>;
}
