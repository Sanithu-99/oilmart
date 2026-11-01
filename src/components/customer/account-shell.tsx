"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Clock3, HeartHandshake, House, LogOut, MapPin, Settings2, ShieldCheck } from "lucide-react";

import type { StoreLocale } from "@/lib/i18n/config";

export function AccountNavigation({ locale }: { locale: StoreLocale }) {
  const pathname = usePathname();
  const links = [
    ["Overview", `/${locale}/account`, House], ["Orders", `/${locale}/account/orders`, Clock3], ["Addresses", `/${locale}/account/addresses`, MapPin], ["Loyalty", `/${locale}/account/loyalty`, HeartHandshake], ["Security", `/${locale}/account/security`, ShieldCheck], ["Preferences", `/${locale}/account/preferences`, Settings2],
  ] as const;
  return <aside className="account-nav"><nav aria-label="Account navigation">{links.map(([label, href, Icon]) => <Link key={href} className={pathname === href || (href.endsWith("/orders") && pathname.startsWith(`${href}/`)) ? "active" : ""} href={href}><Icon size={18}/><span>{label}</span></Link>)}</nav><button onClick={() => signOut({ callbackUrl: `/${locale}` })}><LogOut size={18}/>Sign out</button></aside>;
}
