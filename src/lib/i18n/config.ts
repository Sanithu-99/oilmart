import { notFound } from "next/navigation";

export const locales = ["en", "si", "ta"] as const;
export type StoreLocale = (typeof locales)[number];

export function isStoreLocale(value: string): value is StoreLocale {
  return locales.includes(value as StoreLocale);
}

export function requireLocale(value: string): StoreLocale {
  if (!isStoreLocale(value)) notFound();
  return value;
}

export const localeToDb = { en: "EN", si: "SI", ta: "TA" } as const;
export const localeToIntl = { en: "en-LK", si: "si-LK", ta: "ta-LK" } as const;
