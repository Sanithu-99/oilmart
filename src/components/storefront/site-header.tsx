import Link from "next/link";
import { Droplet, MapPin, Menu, Phone, Search, UserRound } from "lucide-react";

import { storeConfig } from "@/lib/config/store";
import type { StoreLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { CartButton } from "./cart-provider";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({ locale, dictionary }: { locale: StoreLocale; dictionary: Dictionary }) {
  const fullStoreAddress = `${storeConfig.address.line1}, ${storeConfig.address.line2}, ${storeConfig.address.city} ${storeConfig.address.postalCode}, ${storeConfig.address.country}`;
  const nav = [
    [dictionary.nav.shop, `/${locale}/products`],
    [dictionary.nav.categories, `/${locale}/products#catalog-filters`],
    [dictionary.nav.brands, `/${locale}#brands`],
    [dictionary.nav.offers, `/${locale}#offers`],
    [dictionary.nav.about, `/${locale}#about`],
    [dictionary.nav.contact, `/${locale}#contact`],
  ];
  return <header className="site-header">
    <div className="site-container header-main-row">
      <Link href={`/${locale}`} className="brand-lockup" aria-label="Saranankara Oil Mart home">
        <span className="brand-mark"><Droplet size={24} strokeWidth={1.8}/></span>
        <span><strong>Saranankara</strong><small>Oil Mart</small></span>
      </Link>

      <nav className="desktop-primary-nav" aria-label="Primary navigation">
        {nav.map(([label, href]) => <Link className="nav-link" href={href} key={href}>{label}</Link>)}
      </nav>

      <form action={`/${locale}/products`} className="header-search-form">
        <label className="header-search-field"><Search size={16}/><input name="q" placeholder={dictionary.nav.search} aria-label={dictionary.nav.search}/></label>
      </form>

      <div className="header-actions">
        <a className="header-quick-link" href={`tel:${storeConfig.phone.replace(/\s/g, "")}`} aria-label={`Call ${storeConfig.phone}`} title={storeConfig.phone}><Phone size={18}/></a>
        <a className="header-quick-link" href={storeConfig.mapsUrl} target="_blank" rel="noreferrer" aria-label={`Open ${fullStoreAddress} in Google Maps`} title={fullStoreAddress}><MapPin size={18}/></a>
        <nav className="header-language-links" aria-label="Language selector"><LanguageSwitcher locale={locale}/></nav>
        <Link className="icon-button account-button" href={`/${locale}/account`} aria-label="Account"><UserRound size={19}/></Link>
        <CartButton/>
        <details className="mobile-menu">
          <summary className="icon-button"><Menu size={20}/><span className="sr-only">{dictionary.nav.menu}</span></summary>
          <div className="mobile-menu-panel">
            <form action={`/${locale}/products`}><label className="header-search-field"><Search size={16}/><input name="q" placeholder={dictionary.nav.search} aria-label={dictionary.nav.search}/></label></form>
            <nav className="mobile-primary-nav" aria-label="Mobile navigation">{nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav>
            <div className="mobile-menu-utilities">
              <a href={`tel:${storeConfig.phone.replace(/\s/g, "")}`}><Phone size={16}/><span>{storeConfig.phone}</span></a>
              <a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer" aria-label={`Open ${fullStoreAddress} in Google Maps`}><MapPin size={16}/><span>70/5B, Hill St</span></a>
            </div>
            <nav className="mobile-language-links" aria-label="Language selector"><LanguageSwitcher locale={locale}/></nav>
          </div>
        </details>
      </div>
    </div>
  </header>;
}
