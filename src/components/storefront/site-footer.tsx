import Link from "next/link";
import { Clock3, Droplet, MapPin, PackageCheck, Phone, Truck } from "lucide-react";

import { storeConfig } from "@/lib/config/store";
import type { StoreLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function SiteFooter({ locale, dictionary }: { locale: StoreLocale; dictionary: Dictionary }) {
  return <footer className="mt-24 border-t bg-[#f3efe6]" id="contact">
    <div className="site-container grid gap-8 py-12 md:grid-cols-3">
      <section><div className="footer-icon"><MapPin size={20}/></div><h2 className="font-display text-2xl">{dictionary.footer.store}</h2><address className="mt-3 text-sm leading-6 text-muted-foreground not-italic">{storeConfig.address.line1}, {storeConfig.address.line2}<br/>{storeConfig.address.city} {storeConfig.address.postalCode}</address><p className="mt-3 flex items-center gap-2 text-sm"><Phone size={15}/><a href={`tel:${storeConfig.phone.replace(/\s/g, "")}`}>{storeConfig.phone}</a></p></section>
      <section><div className="footer-icon"><PackageCheck size={20}/></div><h2 className="font-display text-2xl">{dictionary.footer.pickup}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{dictionary.footer.pickupBody}</p><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 size={15}/>Confirmation required</p></section>
      <section><div className="footer-icon"><Truck size={20}/></div><h2 className="font-display text-2xl">{dictionary.footer.delivery}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{dictionary.footer.deliveryBody}</p></section>
    </div>
    <div className="site-container flex flex-col gap-5 border-t py-7 sm:flex-row sm:items-center sm:justify-between"><Link href={`/${locale}`} className="brand-lockup"><span className="brand-mark"><Droplet size={25}/></span><span><strong>Saranankara</strong><small>Oil Mart</small></span></Link><p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {storeConfig.name}. {dictionary.footer.rights}</p></div>
  </footer>;
}
