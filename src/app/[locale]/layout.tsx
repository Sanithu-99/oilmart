import type { Metadata } from "next";

import { CartProvider } from "@/components/storefront/cart-provider";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { locales, requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function generateStaticParams() { return locales.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", si: "/si", ta: "/ta", "x-default": "/en" },
    },
  };
}

export default async function StorefrontLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const dictionary = getDictionary(locale);
  return <CartProvider><SiteHeader locale={locale} dictionary={dictionary}/><main>{children}</main><SiteFooter locale={locale} dictionary={dictionary}/></CartProvider>;
}
