import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { headers } from "next/headers";

import { resolveAppUrl } from "@/lib/config/app-url";
import { storeConfig } from "@/lib/config/store";

import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const notoSansSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sans-sinhala",
  subsets: ["sinhala"],
  weight: "variable",
  display: "swap",
  preload: false,
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-noto-sans-tamil",
  subsets: ["tamil"],
  weight: "variable",
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(resolveAppUrl()),
  title: {
    default: storeConfig.name,
    template: `%s | ${storeConfig.name}`,
  },
  description:
    "Automotive lubricants, engine oils, transmission fluids, gear oils, coolants, and related products in Sri Lanka.",
  applicationName: storeConfig.name,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-store-locale") ?? "en";
  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSansSinhala.variable} ${notoSansTamil.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
