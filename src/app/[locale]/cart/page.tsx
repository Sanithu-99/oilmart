import type { Metadata } from "next";

import { CartPage } from "@/components/storefront/cart-page";
import { requireLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

export default async function CartRoute({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  return <CartPage locale={locale} dictionary={getDictionary(locale)}/>;
}
