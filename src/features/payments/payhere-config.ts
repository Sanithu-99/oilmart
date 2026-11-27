import "server-only";
import { getEnv } from "@/lib/env";
import { type PayHereConfig, payHereHost } from "./payhere";
import type { PaymentSettings } from "./settings";

export function getPayHereConfig(): PayHereConfig | null {
  const env = getEnv();
  if (!env.PAYHERE_MERCHANT_ID || !env.PAYHERE_MERCHANT_SECRET) return null;
  const mode = env.PAYHERE_MODE ?? "sandbox";
  const base = new URL(env.APP_URL);
  if (mode === "live" && (base.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(base.hostname))) return null;
  return { merchantId: env.PAYHERE_MERCHANT_ID, merchantSecret: env.PAYHERE_MERCHANT_SECRET, mode, appUrl: base.origin };
}
export function payHereEnabled(settings: PaymentSettings, config = getPayHereConfig()) {
  return Boolean(config && settings.hostedEnabled && settings.hostedHost === payHereHost(config));
}
