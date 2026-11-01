"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";

import { useCart } from "./cart-provider";

export function AddToCart({ variantId, quantity = "1", disabled = false, label = "Add to cart", className = "" }: { variantId?: string; quantity?: string; disabled?: boolean; label?: string; className?: string }) {
  const { add } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className={className}>
    <button className="button-primary w-full justify-center" disabled={disabled || pending || !variantId} onClick={async () => { if (!variantId) return; setPending(true); setError(null); try { await add(variantId, quantity); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add item"); } finally { setPending(false); } }}>
      <ShoppingBag size={17}/>{pending ? "Adding…" : label}
    </button>
    {error && <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>}
  </div>;
}
