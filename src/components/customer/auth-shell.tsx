import Link from "next/link";
import { BadgeCheck, ShieldCheck, Truck } from "lucide-react";

import type { StoreLocale } from "@/lib/i18n/config";

export function AuthShell({ locale: _locale, eyebrow, title, intro, children, alternate }: { locale: StoreLocale; eyebrow: string; title: string; intro: string; children: React.ReactNode; alternate?: { label: string; href: string } }) {
  void _locale;
  return <section className="customer-auth-page"><div className="site-container customer-auth-layout"><div className="customer-auth-story"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p><div className="auth-trust-list"><span><ShieldCheck/>Protected customer account</span><span><BadgeCheck/>Verified loyalty access</span><span><Truck/>Orders in one place</span></div></div><div className="customer-auth-card">{children}{alternate && <p className="auth-alternate">{alternate.label} <Link href={alternate.href}>Continue here</Link></p>}</div></div></section>;
}
