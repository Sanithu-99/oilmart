"use client";

import { useState } from "react";
import { checkoutCopy } from "@/lib/i18n/checkout";
import { commerceCopy } from "@/lib/i18n/commerce";
import { stepQuantity, belowMinimum, exceedsAvailable } from "@/lib/quantity";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cartOrderWhatsAppUrl } from "@/lib/contact/whatsapp";
import { useCart } from "./cart-provider";

const format = (minor: string, locale: string) => new Intl.NumberFormat(locale === "en" ? "en-LK" : `${locale}-LK`, { style: "currency", currency: "LKR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(minor) / 100);

export function CartPage({ locale, dictionary: d }: { locale: string; dictionary: Dictionary }) {
  const { cart, update, remove } = useCart();
  const [method, setMethod] = useState("BANK_TRANSFER");
  const copy = commerceCopy(locale);
  if (!cart) return <div className="site-container py-24"><div className="h-64 animate-pulse rounded-3xl bg-[#f1ede4]"/></div>;
  const totalMinor = method === "CARD" ? cart.cardTotalMinor : cart.totalMinor;
  const whatsappOrderHref = cartOrderWhatsAppUrl({ ...cart, totalMinor, paymentMethod: method });
  return <>
    <section className="cart-hero"><div className="site-container py-16"><p className="eyebrow">Review &amp; confirm</p><h1 className="mt-3 font-display text-6xl sm:text-7xl">{d.cart.title}</h1><p className="mt-4 max-w-2xl text-lg text-slate-600">{d.cart.review}</p></div></section>
    <section className="site-container grid gap-7 py-12 lg:grid-cols-[1fr_380px]">
      {!cart.items.length ? <div className="empty-state lg:col-span-2"><ShoppingBag size={34}/><p>{d.cart.empty}</p><Link className="button-primary mt-4" href={`/${locale}/products`}>{d.cart.continue}</Link></div> : <>
        <div className="rounded-2xl border bg-[#fffdf9] px-5 sm:px-8"><ul className="divide-y">{cart.items.map((item) => <li className="grid gap-5 py-7 sm:grid-cols-[110px_1fr_auto] sm:items-center" key={item.id}><div className="relative aspect-square rounded-xl bg-[#f2eee5]">{item.image && <Image src={item.image.url} alt={item.image.alt} fill sizes="110px" className="object-contain p-2"/>}</div><div><Link href={`/${locale}/products/${item.slug}`} className="font-display text-2xl hover:text-amber-700">{item.name}</Link><div className="mt-1 flex flex-wrap items-baseline gap-2"><p className="text-sm text-muted-foreground">{item.priceAvailable ? format(item.unitPriceMinor, locale) : d.common.priceConfirmation}</p>{item.priceAvailable && BigInt(item.unitPriceMinor) < BigInt(item.standardUnitPriceMinor) && <p className="text-xs text-slate-400 line-through">{format(item.standardUnitPriceMinor, locale)}</p>}{item.priceAvailable && item.priceSource !== "STANDARD" && <span className="w-full text-[10px] font-bold uppercase tracking-[.12em] text-amber-800">{item.priceSource === "LOYALTY" ? d.common.memberPrice : d.common.promotionPrice}</span>}</div><p className="price-change-notice">{copy.priceNotice}</p><p className={`mt-2 text-xs ${item.inStock ? "text-emerald-700" : "text-red-700"}`}>{item.inStock ? d.common.stock : d.common.unavailable}</p></div><div className="flex items-center gap-4 sm:flex-col sm:items-end"><p className="font-display text-xl">{item.priceAvailable ? format(item.lineTotalMinor, locale) : "—"}</p><div className="quantity-control"><button aria-label="Decrease" onClick={() => belowMinimum(stepQuantity(item.quantity, item.quantityStep, -1), item.minQuantity) ? remove(item.id) : update(item.id, stepQuantity(item.quantity, item.quantityStep, -1))}><Minus size={14}/></button><span>{item.quantity}</span><button aria-label="Increase" disabled={exceedsAvailable(stepQuantity(item.quantity, item.quantityStep, 1), item.available)} onClick={() => update(item.id, stepQuantity(item.quantity, item.quantityStep, 1))}><Plus size={14}/></button></div><button className="flex items-center gap-2 text-xs text-amber-700" onClick={() => remove(item.id)}><Trash2 size={15}/>{d.cart.remove}</button></div></li>)}</ul></div>
        <aside className="h-fit rounded-2xl border bg-[#fffdf9] p-7 lg:sticky lg:top-6"><h2 className="font-display text-3xl">{d.cart.summary}</h2>{cart.hasUnavailablePrices && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{d.common.priceConfirmation}. Please contact the store before ordering.</div>}<div className="mt-6 flex justify-between border-b pb-5 text-sm"><span>{d.cart.subtotal}</span><strong>{format(cart.subtotalMinor, locale)}</strong></div><div className="mt-5 flex justify-between"><span>{copy.estimate}</span><strong className="font-display text-2xl">{format(totalMinor, locale)}</strong></div><p className="price-change-notice">{copy.priceNotice}</p><label className="product-size-label mt-5">{copy.paymentMethod}<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="BANK_TRANSFER">{copy.bank}</option><option value="CASH">{copy.cash}</option><option value="CARD">{copy.card}</option></select></label><p className="mt-3 text-xs leading-5">{copy.memberTerms}</p>{method === "CARD" && <p className="mt-3 text-sm">{copy.surcharge}: {format(cart.cardSurchargeMinor, locale)}</p>}<p className="purchase-stock-notice">{copy.stockNotice}</p><p className="mt-3 text-xs leading-5">{copy.paymentUnavailable}</p><Link className="button-secondary mt-4 w-full" href={`/${locale}/requests`}>{copy.requestQuote}</Link><div className="mt-7 rounded-xl bg-[#f4efe5] p-4 text-sm leading-6 text-muted-foreground">{d.cart.checkout}</div><Link href={`/${locale}/checkout`} className="button-primary mt-5 w-full justify-center">{checkoutCopy(locale).checkout}</Link><a href={whatsappOrderHref} target="_blank" rel="noreferrer" className="order-whatsapp-button mt-5 w-full"><MessageCircle size={19}/>{d.cart.orderWhatsApp}</a><Link href={`/${locale}/products`} className="button-secondary mt-3 w-full justify-center">{d.cart.continue}</Link></aside>
      </>}
    </section>
  </>;
}
