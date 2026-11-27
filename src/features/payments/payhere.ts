import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type PayHereConfig = { merchantId: string; merchantSecret: string; mode: "sandbox" | "live"; appUrl: string };
const md5 = (text: string) => createHash("md5").update(text, "utf8").digest("hex").toUpperCase();
export function payHereAmount(minor: bigint) {
  if (minor <= 0n) throw new Error("Payment amount must be positive.");
  return `${minor / 100n}.${(minor % 100n).toString().padStart(2, "0")}`;
}
export function payHereHost(config: Pick<PayHereConfig, "mode">) { return config.mode === "live" ? "www.payhere.lk" : "sandbox.payhere.lk"; }
export function payHereCheckoutHash(config: PayHereConfig, orderId: string, amount: string, currency: string) {
  return md5(config.merchantId + orderId + amount + currency + md5(config.merchantSecret));
}
export const payHereNotificationSchema = z.object({
  merchant_id: z.string().regex(/^\d{4,20}$/), order_id: z.string().uuid(), payment_id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  payhere_amount: z.string().regex(/^\d{1,16}\.\d{2}$/), payhere_currency: z.literal("LKR"),
  status_code: z.enum(["2", "0", "-1", "-2", "-3"]), md5sig: z.string().regex(/^[a-fA-F0-9]{32}$/),
});
export type PayHereNotification = z.infer<typeof payHereNotificationSchema>;
export function verifyPayHereNotification(config: PayHereConfig, input: PayHereNotification) {
  if (input.merchant_id !== config.merchantId) return false;
  const expected = md5(input.merchant_id + input.order_id + input.payhere_amount + input.payhere_currency + input.status_code + md5(config.merchantSecret));
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(input.md5sig, "hex"));
}
export const billingSchema = z.object({
  orderId: z.string().min(1).max(100), updatedAt: z.iso.datetime(), locale: z.enum(["en", "si", "ta"]),
  firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80),
  address: z.string().trim().min(5).max(200), city: z.string().trim().min(2).max(80), accepted: z.literal("on"),
});
