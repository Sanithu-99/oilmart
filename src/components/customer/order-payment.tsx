import Image from "next/image";
import { ReportPaymentForm } from "./checkout-form";
import { checkoutCopy } from "@/lib/i18n/checkout";
import { paymentSettingsSchema } from "@/features/payments/settings";
import { currentHostedLink, paymentQr } from "@/features/payments/qr";
import { isPaymentOpen } from "@/features/orders/rules";
import { getEnv } from "@/lib/env";
import type { ManagedOrder } from "@/features/orders/service";
import { payHereEnabled } from "@/features/payments/payhere-config";
import { PayHereCheckout } from "./payhere-checkout";

export async function OrderPayment({ order, locale }: { order: ManagedOrder; locale: string }) {
  const copy = checkoutCopy(locale);
  if (order.status === "DRAFT") return <p className="purchase-stock-notice">{copy.stockPending}</p>;
  if (order.status === "CANCELLED") return <p>{copy.cancelled}</p>;
  if (!isPaymentOpen(order.status)) return <p className="purchase-stock-notice">{order.payments.some((payment) => payment.status === "PAID") ? copy.paid : copy.cancelled}</p>;
  const snapshot = order.pricingSnapshot as Record<string, unknown>;
  if (snapshot.stockConfirmed !== true) return <p>{copy.stockPending}</p>;
  const settings = paymentSettingsSchema.parse(snapshot.paymentDetails ?? {});
  const payment = order.payments.find((entry) => ["PENDING", "AWAITING_VERIFICATION"].includes(entry.status));
  if (!payment) return <p>{copy.stockPending}</p>;
  const hosted = settings.hostedEnabled ? currentHostedLink(order, settings.hostedHost) : null;
  const automatic = payment.method === "ONLINE_PROVIDER" && payHereEnabled(settings);
  const internal = new URL(`/${locale}/account/orders/${order.id}`, getEnv().APP_URL).toString();
  const qr = await paymentQr(hosted ?? internal);
  return <section className="detail-panel mt-8"><h3 className="font-display text-2xl">{copy.payment}</h3><p className="my-4 break-all text-sm">{copy.reference}: <strong>{order.orderNumber}</strong></p>
    {payment.method === "BANK_TRANSFER" && settings.bankEnabled && <div className="space-y-2 text-sm"><p>{copy.bank}: <strong>{settings.bankName}</strong> {settings.branch}</p><p>{copy.account}: <strong>{settings.accountName}</strong></p><p>{copy.number}: <strong>{settings.accountNumber}</strong></p><p>{copy.transferNote}</p></div>}
    {payment.method === "MANUAL_OTHER" && settings.phoneEnabled && <div className="space-y-2 text-sm"><p>{copy.phoneNote}</p><p>{copy.phone}: <strong>{settings.receivingPhone}</strong></p><p>{copy.recipient}: <strong>{settings.phoneAccountName}</strong></p></div>}
    {payment.method === "CASH_ON_PICKUP" && <p>{copy.cashNote}</p>}
    {payment.method === "ONLINE_PROVIDER" && (hosted ? <a className="button-primary" href={hosted} target="_blank" rel="noreferrer">{copy.openPayment}</a> : automatic ? <PayHereCheckout orderId={order.id} updatedAt={order.updatedAt.toISOString()} locale={locale}/> : <p>{copy.pendingLink}</p>)}
    {settings.instructions && <p className="mt-4 whitespace-pre-wrap text-sm">{settings.instructions}</p>}
    <div className="mt-6"><Image src={qr} width={280} height={280} unoptimized alt={copy.qr}/><p className="max-w-sm text-xs">{copy.qrNote}</p></div>
    {payment.method !== "CASH_ON_PICKUP" && !automatic && <ReportPaymentForm key={order.updatedAt.toISOString()} orderId={order.id} updatedAt={order.updatedAt.toISOString()} locale={locale}/>}
  </section>;
}
