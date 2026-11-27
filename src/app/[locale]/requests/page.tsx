import { publicProductName } from "@/lib/catalog/product-options";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestForm } from "@/components/customer/request-form";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { db } from "@/lib/db/client";
import { requireLocale } from "@/lib/i18n/config";
import { checkoutCopy } from "@/lib/i18n/checkout";
import { commerceCopy } from "@/lib/i18n/commerce";
import { formatLkr } from "@/lib/pricing/money";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string; product?: string }> };
export async function generateMetadata({ params }: Props) { return { title: commerceCopy((await params).locale).requests, robots: { index: false, follow: false } }; }

export default async function RequestsPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  const query = await searchParams;
  const kind = query.kind === "preorder" ? "preorder" : "quote";
  const next = `/${locale}/requests?${new URLSearchParams({ kind, ...(query.product ? { product: query.product } : {}) })}`;
  const customer = await requireCustomerPage(locale, next);
  const copy = commerceCopy(locale);
  const [product, quotes, preorders] = await Promise.all([
    query.product ? db.product.findFirst({ where: { slug: query.product, status: "ACTIVE" }, select: { slug: true, sku: true, name: true, acceptsPreOrders: true, variants: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } } }) : null,
    db.quotation.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.preOrder.findMany({ where: { customerId: customer.id }, include: { product: { select: { name: true, sku: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  if (query.product && !product || kind === "preorder" && !product?.acceptsPreOrders) notFound();
  return <section className="site-container py-12"><Link href={`/${locale}/account`} className="text-link">← {copy.requests}</Link><h1 className="my-6 font-display text-4xl">{kind === "quote" ? copy.requestQuote : copy.preorder}</h1><div className="grid gap-8 lg:grid-cols-2">
    <RequestForm requestKey={randomUUID()} locale={locale} kind={kind} product={product ? { ...product, name: publicProductName(product.name, product.sku) } : null} name={customer.user.name ?? customer.firstName ?? ""} phone={customer.user.phone ?? ""}/>
    <section className="detail-panel"><h2>{copy.history}</h2>{!quotes.length && !preorders.length && <p className="mt-4">{copy.noRequests}</p>}<div className="request-history">{quotes.map((quote) => <article key={quote.id}><strong className="break-all">{quote.reference}</strong><p>{quote.status.replaceAll("_", " ")}</p><p>{quote.reviewedAt ? `${copy.fee}: ${formatLkr(quote.feeMinor, `${locale}-LK`)}` : copy.awaitingFee}</p>{quote.terms && <p className="whitespace-pre-wrap">{quote.terms}</p>}{quote.orderId ? <Link className="button-secondary mt-3" href={`/${locale}/account/orders/${quote.orderId}`}>{checkoutCopy(locale).viewOrder}</Link> : ["PREPARED", "SENT"].includes(quote.status) && <Link className="button-primary mt-3" href={`/${locale}/checkout?source=quotation&id=${quote.id}`}>{checkoutCopy(locale).feeAccept}</Link>}<small className="block mt-3">{quote.feePaid ? checkoutCopy(locale).paid : copy.noCharge}</small></article>)}{preorders.map((item) => <article key={item.id}><strong>{publicProductName(item.product.name,item.product.sku)}</strong><p>{item.status.replaceAll("_", " ")}</p><p className="break-all text-xs">{item.reference}</p>{item.decisionNotes && <p>{item.decisionNotes}</p>}{item.orderId ? <Link className="button-secondary mt-3" href={`/${locale}/account/orders/${item.orderId}`}>{checkoutCopy(locale).viewOrder}</Link> : item.status === "APPROVED" && <Link className="button-primary mt-3" href={`/${locale}/checkout?source=preorder&id=${item.id}`}>{checkoutCopy(locale).approvedContinue}</Link>}<small className="block mt-3">{copy.preorderPolicy}</small></article>)}</div></section>
  </div></section>;
}
