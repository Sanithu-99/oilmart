import "server-only";
import QRCode from "qrcode";
import { isPaymentOpen, hostedPaymentUrl } from "@/features/orders/rules";
import type { ManagedOrder } from "@/features/orders/service";

export function currentHostedLink(order: ManagedOrder, host: string, now = new Date()) {
  if (!isPaymentOpen(order.status)) return null;
  const payment = order.payments.find((entry) => entry.method === "ONLINE_PROVIDER" && ["PENDING", "AWAITING_VERIFICATION"].includes(entry.status));
  const attempt = payment?.attempts[0];
  if (!attempt || attempt.status !== "PENDING") return null;
  const metadata = attempt.responseMetadata as Record<string, unknown> | null;
  const request = attempt.requestMetadata as Record<string, unknown> | null;
  if (!metadata || typeof metadata.url !== "string" || typeof metadata.expiresAt !== "string" || request?.amountMinor !== order.totalMinor.toString() || request?.currency !== order.currency) return null;
  const expires = new Date(metadata.expiresAt);
  if (!Number.isFinite(expires.getTime()) || expires <= now) return null;
  try { return hostedPaymentUrl(metadata.url, host); } catch { return null; }
}
export async function paymentQr(url: string) {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", width: 280, margin: 4, color: { dark: "#000000", light: "#ffffff" } });
}
