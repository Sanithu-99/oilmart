"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { AddToCart } from "./add-to-cart";

export function ProductPurchase({ variantId, available, minQuantity, quantityStep, label }: { variantId?: string; available: number; minQuantity: string; quantityStep: string; label: string }) {
  const min = Number(minQuantity);
  const step = Number(quantityStep);
  const [quantity, setQuantity] = useState(min);
  return <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="quantity-control h-12 shrink-0"><button aria-label="Decrease quantity" disabled={quantity <= min} onClick={() => setQuantity(Math.max(min, quantity - step))}><Minus size={17}/></button><output className="min-w-12 text-center">{quantity}</output><button aria-label="Increase quantity" disabled={quantity + step > available} onClick={() => setQuantity(quantity + step)}><Plus size={17}/></button></div><AddToCart className="flex-1" variantId={variantId} quantity={String(quantity)} disabled={available <= 0} label={label}/></div>;
}
