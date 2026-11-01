import Link from "next/link";

import { storeConfig } from "@/lib/config/store";
import type { StoreLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function SiteFooter({ locale, dictionary }: { locale: StoreLocale; dictionary: Dictionary }) {
  return <footer className="storefront-footer" id="contact">
    <div className="site-container footer-service-grid">
      <section className="footer-service-card">
        <span className="footer-service-number">01</span>
        <div><h2>{dictionary.footer.store}</h2><address>{storeConfig.address.line1}, {storeConfig.address.line2}<br/>{storeConfig.address.city} {storeConfig.address.postalCode}</address><a className="footer-service-link" href={`tel:${storeConfig.phone.replace(/\s/g, "")}`}>{storeConfig.phone}</a></div>
      </section>
      <section className="footer-service-card">
        <span className="footer-service-number">02</span>
        <div><h2>{dictionary.footer.pickup}</h2><p>{dictionary.footer.pickupBody}</p><span className="footer-service-note">{dictionary.footer.confirmation}</span></div>
      </section>
      <section className="footer-service-card">
        <span className="footer-service-number">03</span>
        <div><h2>{dictionary.footer.delivery}</h2><p>{dictionary.footer.deliveryBody}</p></div>
      </section>
    </div>
    <div className="site-container footer-meta"><Link href={`/${locale}`} className="footer-small-wordmark"><strong>Saranankara</strong><span>Oil Mart</span></Link><p>© {new Date().getFullYear()} {storeConfig.name}. {dictionary.footer.rights}</p></div>
    <Link href={`/${locale}`} className="footer-oil-signoff" aria-label="Saranankara Oil Mart home">
      <span className="footer-oil-flow" aria-hidden="true"><i/><i/><i/><i/></span>
      <span className="footer-oil-caption">Automotive oils · Dehiwala</span>
      <span className="footer-oil-name">Saranankara</span>
      <span className="footer-oil-subname">Oil Mart</span>
    </Link>
  </footer>;
}
