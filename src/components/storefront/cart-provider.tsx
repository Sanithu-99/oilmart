"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

type CartItem = {
  id: string; variantId: string; slug: string; name: string; quantity: string; quantityStep: string;
  available: number; inStock: boolean; priceAvailable: boolean; standardUnitPriceMinor: string; unitPriceMinor: string; lineTotalMinor: string;
  priceSource: "STANDARD" | "LOYALTY" | "PROMOTION";
  image: { url: string; alt: string } | null;
};
type Cart = { itemCount: number; items: CartItem[]; subtotalMinor: string; totalMinor: string; currency: string; hasUnavailablePrices: boolean };
type CartContextValue = {
  cart: Cart | null; open: boolean; setOpen(value: boolean): void;
  add(variantId: string, quantity?: string): Promise<void>;
  update(itemId: string, quantity: string): Promise<void>;
  remove(itemId: string): Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const format = (minor: string) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(minor) / 100);
const priceLabels = {
  en: { loyalty: "Member price", promotion: "Promotion price", confirmation: "Price confirmation needed" },
  si: { loyalty: "සාමාජික මිල", promotion: "ප්‍රවර්ධන මිල", confirmation: "මිල තහවුරු කිරීම අවශ්‍යයි" },
  ta: { loyalty: "உறுப்பினர் விலை", promotion: "சலுகை விலை", confirmation: "விலை உறுதிப்படுத்தல் தேவை" },
} as const;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";
  const labels = priceLabels[locale as keyof typeof priceLabels] ?? priceLabels.en;
  const loadCart = useCallback(async () => {
    const response = await fetch("/api/cart", { cache: "no-store" });
    if (response.ok) setCart(await response.json());
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/cart", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (active && body) setCart(body); });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadCart();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const interval = window.setInterval(() => void loadCart(), 60_000);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [loadCart]);

  const changeOpen = useCallback((value: boolean) => {
    if (value) void loadCart();
    setOpen(value);
  }, [loadCart]);

  const mutate = useCallback(async (url: string, init: RequestInit) => {
    const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Cart update failed");
    setCart(body);
    router.refresh();
  }, [router]);

  const value = useMemo<CartContextValue>(() => ({
    cart, open, setOpen: changeOpen,
    async add(variantId, quantity = "1") {
      await mutate("/api/cart/items", { method: "POST", body: JSON.stringify({ variantId, quantity }) });
      setOpen(true);
    },
    async update(itemId, quantity) { await mutate(`/api/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }); },
    async remove(itemId) { await mutate(`/api/cart/items/${itemId}`, { method: "DELETE" }); },
  }), [cart, changeOpen, mutate, open]);

  return <CartContext.Provider value={value}>
    {children}
    {open && <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-label="Shopping cart">
      <button className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label="Close cart" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#fffdf8] shadow-2xl">
        <div className="flex items-center justify-between border-b p-6"><div><p className="eyebrow">Review</p><h2 className="font-display text-3xl">Your cart</h2></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20} /><span className="sr-only">Close</span></button></div>
        <div className="flex-1 overflow-y-auto p-6">
          {!cart?.items.length ? <div className="grid h-full place-items-center text-center"><div><ShoppingBag className="mx-auto mb-4 text-amber-700" size={34}/><p>Your cart is empty.</p></div></div> : <ul className="space-y-5">
            {cart.items.map((item) => <li className="flex gap-4 border-b pb-5" key={item.id}>
              <div className="relative h-24 w-20 shrink-0 rounded-xl bg-[#f2eee5]">{item.image && <Image src={item.image.url} alt={item.image.alt} fill sizes="80px" className="object-contain p-2" />}</div>
              <div className="min-w-0 flex-1"><Link href={`/${locale}/products/${item.slug}`} onClick={() => setOpen(false)} className="font-display text-lg leading-tight hover:text-amber-700">{item.name}</Link><div className="mt-1 flex flex-wrap items-baseline gap-2"><p className="text-sm text-muted-foreground">{item.priceAvailable ? format(item.unitPriceMinor) : labels.confirmation}</p>{item.priceAvailable && BigInt(item.unitPriceMinor) < BigInt(item.standardUnitPriceMinor) && <p className="text-xs text-slate-400 line-through">{format(item.standardUnitPriceMinor)}</p>}{item.priceAvailable && item.priceSource !== "STANDARD" && <span className="w-full text-[9px] font-bold uppercase tracking-[.11em] text-amber-800">{item.priceSource === "LOYALTY" ? labels.loyalty : labels.promotion}</span>}</div>
                <div className="mt-3 flex items-center justify-between"><div className="quantity-control"><button onClick={() => Number(item.quantity) <= 1 ? value.remove(item.id) : value.update(item.id, String(Number(item.quantity)-Number(item.quantityStep)))}><Minus size={14}/></button><span>{item.quantity}</span><button disabled={Number(item.quantity) >= item.available} onClick={() => value.update(item.id, String(Number(item.quantity)+Number(item.quantityStep)))}><Plus size={14}/></button></div><button className="text-amber-700" onClick={() => value.remove(item.id)}><Trash2 size={17}/><span className="sr-only">Remove</span></button></div>
              </div>
            </li>)}
          </ul>}
        </div>
        {Boolean(cart?.items.length) && <div className="border-t p-6">{cart!.hasUnavailablePrices && <p className="mb-4 rounded-xl bg-[#f4efe5] p-3 text-xs leading-5 text-muted-foreground">One or more prices changed to “confirm with store”. Review the cart before ordering.</p>}<div className="mb-5 flex justify-between"><span>Subtotal</span><strong className="font-display text-xl">{format(cart!.subtotalMinor)}</strong></div><Link href={`/${locale}/cart`} onClick={() => setOpen(false)} className="button-primary w-full justify-center">View cart</Link></div>}
      </aside>
    </div>}
  </CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

export function CartButton() {
  const { cart, setOpen } = useCart();
  return <button className="relative icon-button" onClick={() => setOpen(true)} aria-label={`Cart with ${cart?.itemCount ?? 0} items`}><ShoppingBag size={21}/>{Boolean(cart?.itemCount) && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#9d4237] px-1 text-[11px] font-bold text-white">{cart!.itemCount}</span>}</button>;
}
