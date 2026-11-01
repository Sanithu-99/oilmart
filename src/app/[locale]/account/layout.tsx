import Image from "next/image";

import { AccountNavigation } from "@/components/customer/account-shell";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { requireLocale } from "@/lib/i18n/config";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const customer = await requireCustomerPage(locale);
  return <section className="account-page">
    <div className="account-hero">
      <div className="account-hero-media"><Image className="account-hero-photo" src="/images/account/account-hero-v2.png" alt="Automotive service journey beside an open vehicle" fill sizes="(min-width: 1024px) 54vw, 100vw" priority/></div>
      <div className="site-container account-hero-copy"><p className="eyebrow">My account</p><h1>Your orders & loyalty</h1><p>Welcome back, {customer.firstName ?? customer.user.name ?? "customer"}. Manage your details, deliveries and rewards.</p></div>
    </div>
    <div className="site-container account-layout"><AccountNavigation locale={locale}/><div className="account-content">{children}</div></div>
  </section>;
}
