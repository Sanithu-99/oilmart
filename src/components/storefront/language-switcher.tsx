"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { StoreLocale } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale, compact = false }: { locale: StoreLocale; compact?: boolean }) {
  const pathname = usePathname();
  const localizedHref = (nextLocale: StoreLocale) => {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  };
  return <>{(["en", "si", "ta"] as const).map((item) => <Link key={item} href={localizedHref(item)} className={`language-link ${item === locale ? "active" : ""}`} hrefLang={item}>{compact ? item.toUpperCase() : item === "en" ? "EN" : item === "si" ? "සිං" : "தமிழ்"}</Link>)}</>;
}
