import { z } from "zod";

export const commerceBatchSchema = z.object({
  operation: z.enum(["LOYALTY", "ENABLE_PREORDERS", "DISABLE_PREORDERS"]),
  products: z.array(z.object({ id: z.string().min(1), updatedAt: z.iso.datetime() })).min(1).max(50),
  discount: z.string().trim().default(""),
  reason: z.string().trim().min(5).max(500),
  acknowledged: z.literal("on"),
}).superRefine((value, ctx) => {
  if (new Set(value.products.map(p => p.id)).size !== value.products.length) ctx.addIssue({code:"custom", message:"Select each product only once."});
  if (value.operation === "LOYALTY" && !/^(?:[1-9]\d?|0)(?:\.\d{1,2})?$/.test(value.discount)) ctx.addIssue({code:"custom",message:"Enter a discount greater than 0 and less than 100, with up to two decimals."});
});

/** Exact integer rounding, shared by the preview and trusted action. */
export function discountedLoyaltyPrice(retail: bigint, percent: string) {
  if (!/^(?:[1-9]\d?|0)(?:\.\d{1,2})?$/.test(percent)) throw new Error("Enter a discount greater than 0 and less than 100.");
  const [whole, decimal = ""] = percent.split(".");
  const basisPoints = BigInt(whole!) * 100n + BigInt(decimal.padEnd(2, "0"));
  if (basisPoints <= 0n || basisPoints >= 10000n || retail <= 0n) throw new Error("A positive retail price and discount are required.");
  const result = (retail * (10000n - basisPoints) + 5000n) / 10000n;
  if (result <= 0n || result >= retail) throw new Error("This discount cannot produce a positive lower price for every selected item.");
  return result;
}
