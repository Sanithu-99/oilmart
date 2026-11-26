"use client";

import { Minus, Plus } from "lucide-react";
import Decimal from "decimal.js";
import { commerceCopy } from "@/lib/i18n/commerce";
import { useState } from "react";

import { AddToCart } from "./add-to-cart";

export function ProductPurchase({ variantId, available, minQuantity, quantityStep, label, locale = "en" }: { variantId?: string; available: number; minQuantity: string; quantityStep: string; label: string; locale?: string }) {
  const copy = commerceCopy(locale);
  const min = Number(minQuantity);
  const step = Number(quantityStep);
  const [quantity, setQuantity] = useState(min);
  return <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="quantity-control h-12 shrink-0"><button aria-label={copy.decrease} disabled={quantity <= min} onClick={() => setQuantity(Math.max(min, new Decimal(quantity).minus(step).toNumber()))}><Minus size={17}/></button><output className="min-w-12 text-center">{quantity}</output><button aria-label={copy.increase} disabled={quantity + step > available} onClick={() => setQuantity(new Decimal(quantity).plus(step).toNumber())}><Plus size={17}/></button></div><AddToCart className="flex-1" variantId={variantId} quantity={String(quantity)} disabled={available <= 0} label={label}/></div>;
}
