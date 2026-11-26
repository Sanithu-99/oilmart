import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/customer/checkout-form";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { getCart } from "@/features/cart/service";
import { getProductBySlug } from "@/features/catalog/queries";
import { getPaymentSettings, enabledPaymentMethods } from "@/features/payments/settings";
import { db } from "@/lib/db/client";
import { requireLocale } from "@/lib/i18n/config";
import { checkoutCopy } from "@/lib/i18n/checkout";
import { formatLkr, multiplyMinorUnits } from "@/lib/pricing/money";
import { purchaseFingerprint } from "@/features/orders/rules";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ source?: string; id?: string }> };
export async function generateMetadata({ params }: Props) { return { title: checkoutCopy((await params).locale).title, robots: { index: false, follow: false } }; }
export default async function CheckoutPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale), query = await searchParams;
  const customer = await requireCustomerPage(locale, `/${locale}/checkout?${new URLSearchParams({ source: query.source ?? "cart", id: query.id ?? "" })}`);
  const copy = checkoutCopy(locale), settings = await getPaymentSettings();
  let source: "cart" | "preorder" | "quotation" = "cart", sourceId = "", total = 0n;
  let lines: Array<{ name: string; quantity: string; total: bigint }> = [];
  let sourceVersion = "", fingerprint = "", requestTerms = "";
  if (query.source === "quotation") {
    const quote = await db.quotation.findFirst({ where: { id: query.id ?? "", customerId: customer.id } });
    if (!quote || !["PREPARED", "SENT"].includes(quote.status) || quote.validUntil && quote.validUntil < new Date()) notFound();
    source = "quotation"; sourceId = quote.id; total = quote.feeMinor;
    sourceVersion = quote.updatedAt.toISOString();
    requestTerms = quote.terms ?? "";
    lines = [{ name: copy.noItems, quantity: "1", total }];
  } else if (query.source === "preorder") {
    const request = await db.preOrder.findFirst({ where: { id: query.id ?? "", customerId: customer.id, status: "APPROVED" }, include: { product: true, variant: true } });
    if (!request || request.expiresAt && request.expiresAt < new Date()) notFound();
    const data = await getProductBySlug(request.product.slug, locale);
    const variant = data?.product.variants.find((item) => item.id === request.variantId);
    if (!variant || BigInt(variant.priceMinor) <= 0n) return <section className="site-container py-16"><h1>{copy.preorderTitle}</h1><p>Contact the shop to confirm the product price before continuing.</p></section>;
    source = "preorder"; sourceId = request.id; total = multiplyMinorUnits(BigInt(variant.priceMinor), request.quantity.toString());
    sourceVersion = request.updatedAt.toISOString();
    requestTerms = request.decisionNotes ?? "";
    lines = [{ name: data!.product.name, quantity: request.quantity.toString(), total }];
  } else {
    const cart = await getCart({ customerId: customer.id });
    if (!cart.id || !cart.items.length || cart.hasUnavailablePrices) return <section className="site-container py-16"><h1>{copy.title}</h1><Link className="button-primary mt-4" href={`/${locale}/cart`}>{copy.products}</Link></section>;
    sourceId = cart.id; total = BigInt(cart.totalMinor);
    fingerprint = purchaseFingerprint(cart.items);
    lines = cart.items.map((item) => ({ name: item.name, quantity: item.quantity, total: BigInt(item.lineTotalMinor) }));
  }
  return <section className="site-container py-12"><h1 className="mb-8 font-display text-4xl">{source === "quotation" ? copy.feeTitle : source === "preorder" ? copy.preorderTitle : copy.title}</h1><div className="grid gap-8 lg:grid-cols-2"><div className="detail-panel"><h2>{source === "quotation" ? copy.feeTitle : copy.pickup}</h2>{lines.map((line, index) => <div className="order-line" key={index}><strong>{line.name}</strong><span>{line.quantity}</span><span>{formatLkr(line.total, `${locale}-LK`)}</span></div>)}{requestTerms && <p className="mt-5 whitespace-pre-wrap text-sm">{requestTerms}</p>}<p className="mt-6 font-semibold">{copy.total}: {formatLkr(total, `${locale}-LK`)}</p><p className="price-change-notice">{locale === "si" ? "මිල ගණන් වෙනස් විය හැක." : locale === "ta" ? "விலைகள் மாற்றத்திற்கு உட்பட்டவை." : "Prices are subject to change."}</p>{source !== "quotation" && <p className="mt-4 text-sm">{copy.pickupNote}</p>}</div><div className="detail-panel"><CheckoutForm source={source} sourceId={sourceId} total={total.toString()} locale={locale} methods={enabledPaymentMethods(settings)} sourceVersion={sourceVersion} fingerprint={fingerprint}/></div></div></section>;
}
