import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { OrderPayment } from "@/components/customer/order-payment";
import { reorderAction } from "@/features/customer/account/actions";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { orderInclude } from "@/features/orders/service";
import { db } from "@/lib/db/client";
import { requireLocale } from "@/lib/i18n/config";
import { checkoutCopy } from "@/lib/i18n/checkout";
import { commerceCopy } from "@/lib/i18n/commerce";
import { publicProductName } from "@/lib/catalog/product-options";
import { formatLkr } from "@/lib/pricing/money";

export default async function Page({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale: raw, orderId } = await params, locale = requireLocale(raw);
  const customer = await requireCustomerPage(locale);
  const order = await db.order.findFirst({ where: { id: orderId, customerId: customer.id }, include: { ...orderInclude, statusHistory: { orderBy: { createdAt: "asc" } }, notes: { where: { internal: false }, orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const copy = checkoutCopy(locale), feeOrder = (order.pricingSnapshot as Record<string, unknown>).kind === "QUOTATION_FEE";
  const feeTerms = (order.pricingSnapshot as Record<string, unknown>).feeTerms;
  const money = (amount: bigint) => formatLkr(amount, `${locale}-LK`);
  return <section className="account-panel">
    <Link className="text-link" href={`/${locale}/account/orders`}><ArrowLeft size={15}/>{copy.order}</Link>
    <div className="panel-heading order-detail-heading"><div><p className="eyebrow">{copy.order}</p><h2 className="break-all">{order.orderNumber}</h2><p>{order.createdAt.toLocaleString(`${locale}-LK`, { timeZone: "Asia/Colombo" })}</p></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></div>
    <div className="order-detail-grid"><div><h3>{feeOrder ? copy.noItems : copy.products}</h3>{feeOrder && <p className="mt-4">{copy.feeNote}</p>}{typeof feeTerms === "string" && <p className="mt-4 whitespace-pre-wrap">{feeTerms}</p>}{order.items.map((item) => <div className="order-line" key={item.id}><div><strong>{publicProductName(item.productName,item.sku)}</strong><small>{publicProductName(item.variantName)}</small></div><span>{item.quantity.toString()} x {money(item.unitPriceMinor)}</span><strong>{money(item.lineTotalMinor)}</strong></div>)}</div><aside className="order-totals"><h3>{copy.total}</h3><p className="total"><span>{copy.total}</span><strong>{money(order.totalMinor)}</strong></p><p className="price-change-notice">{commerceCopy(locale).priceNotice}</p><small>{feeOrder ? copy.noItems : copy.pickup}</small></aside></div>
    <OrderPayment order={order} locale={locale}/>
    <div className="order-timeline"><h3>{copy.history}</h3>{order.statusHistory.map((event) => <p key={event.id}><span/><strong>{event.toStatus.replaceAll("_", " ")}</strong><small>{event.createdAt.toLocaleString(`${locale}-LK`, { timeZone: "Asia/Colombo" })}</small></p>)}{order.notes.map((note) => <p key={note.id} className="whitespace-pre-wrap">{note.body}</p>)}</div>
    {order.items.length > 0 && <form noValidate action={reorderAction}><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="locale" value={locale}/><button className="button-primary"><RotateCcw size={16}/>{copy.products}</button></form>}
  </section>;
}
