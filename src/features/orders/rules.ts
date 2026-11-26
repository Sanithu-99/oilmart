import Decimal from "decimal.js";
import { z } from "zod";

export class CommerceError extends Error {}
export const checkoutSchema = z.object({
  source: z.enum(["cart", "preorder", "quotation"]), sourceId: z.string().min(1),
  locale: z.enum(["en", "si", "ta"]), method: z.enum(["CASH", "BANK", "PHONE", "HOSTED"]),
  expectedTotal: z.string().regex(/^\d+$/), accepted: z.literal("on"),
  sourceVersion: z.string().optional(), fingerprint: z.string().max(30000).optional(),
});
export type CheckoutMethod = z.infer<typeof checkoutSchema>["method"];

export function assertQuantity(quantity: string, minimum: string, step: string) {
  const q = new Decimal(quantity), min = new Decimal(minimum), increment = new Decimal(step);
  if (!q.isFinite() || q.lte(0) || q.decimalPlaces() > 3 || min.lte(0) || increment.lte(0) || q.lt(min) || !q.minus(min).mod(increment).isZero()) throw new CommerceError("Quantity rules changed. Review the selected size and quantity.");
}

export function stockMovement(onHand: string, reserved: string, quantity: string, operation: "reserve" | "release" | "commit") {
  const hand = new Decimal(onHand), held = new Decimal(reserved), q = new Decimal(quantity);
  if (!q.isFinite() || q.lte(0) || hand.lt(0) || held.lt(0) || held.gt(hand)) throw new CommerceError("Invalid inventory balance. Ask the shop to review stock.");
  if (operation === "reserve" && hand.minus(held).lt(q)) throw new CommerceError("Insufficient available stock. Payment remains blocked.");
  if (operation !== "reserve" && held.lt(q)) throw new CommerceError("The stock reservation is no longer valid.");
  return { onHand: (operation === "commit" ? hand.minus(q) : hand).toString(), reserved: (operation === "reserve" ? held.plus(q) : held.minus(q)).toString() };
}

export function hostedPaymentUrl(input: string, allowedHost: string) {
  let url: URL;
  try { url = new URL(input); } catch { throw new CommerceError("Enter a valid hosted payment URL."); }
  if (url.protocol !== "https:" || url.username || url.password || !allowedHost || url.hostname !== allowedHost || url.port) throw new CommerceError("Use the configured payment provider's HTTPS checkout domain.");
  return url.toString();
}

export function isPaymentOpen(status: string) { return status === "PENDING_PAYMENT" || status === "AWAITING_MANUAL_VERIFICATION"; }
export function assertCurrentVersion(actual: Date, expected: Date) {
  if (actual.getTime() !== expected.getTime()) throw new CommerceError("This record changed. Reload and review the latest details.");
}
export function purchaseFingerprint(lines: Array<{ variantId: string; quantity: string; unitPriceMinor: string }>) {
  return JSON.stringify(lines.map((line) => [line.variantId, new Decimal(line.quantity).toString(), line.unitPriceMinor]).sort((a, b) => a[0]!.localeCompare(b[0]!)));
}
