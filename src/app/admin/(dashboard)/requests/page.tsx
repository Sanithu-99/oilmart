import { requireAdminPage } from "@/features/admin/auth/authorization";
import { RequestReview } from "@/components/admin/request-review";
import { db } from "@/lib/db/client";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await requireAdminPage();
  const canQuote = actor.permissions.has("quotations.manage");
  const canPreorder = actor.permissions.has("preorders.manage");
  if (!canQuote && !canPreorder) return <section className="admin-panel"><h1>Access restricted</h1><p>Request management permission is required.</p></section>;
  const page = Math.max(1, Math.floor(Number((await searchParams).page) || 1));
  const take = 15;
  const [quotes, preorders, quoteCount, preorderCount] = await Promise.all([
    canQuote ? db.quotation.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }) : [],
    canPreorder ? db.preOrder.findMany({ include: { product: { select: { name: true } }, variant: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }) : [],
    canQuote ? db.quotation.count() : 0, canPreorder ? db.preOrder.count() : 0,
  ]);
  return <><header className="admin-page-heading"><div><p className="admin-eyebrow">Shop approval</p><h1>Quotations &amp; pre-orders</h1><p>Set each quotation fee for the vehicle or customer. Review pre-orders before confirming availability. No payment is collected here.</p></div></header>
    <div className="grid gap-6 xl:grid-cols-2">{canQuote && <section className="admin-panel"><h2>Quotations ({quoteCount})</h2>{!quotes.length && <p className="mt-4">No quotations on this page.</p>}{quotes.map((quote) => <article key={quote.id} className="request-review-card"><strong>{quote.customerName}</strong><p>{quote.customerPhone} · {quote.customerEmail}</p><code className="break-all text-xs">{quote.reference}</code><p>{quote.status.replaceAll("_", " ")}</p><p className="whitespace-pre-wrap">{quote.notes}</p>{["REQUESTED", "UNDER_REVIEW", "PREPARED"].includes(quote.status) && <RequestReview key={quote.updatedAt.toISOString()} id={quote.id} kind="quote" updatedAt={quote.updatedAt.toISOString()} fee={quote.reviewedAt ? (Number(quote.feeMinor) / 100).toFixed(2) : ""} notes={quote.terms ?? ""}/>}</article>)}</section>}
    {canPreorder && <section className="admin-panel"><h2>Pre-orders ({preorderCount})</h2>{!preorders.length && <p className="mt-4">No pre-orders on this page.</p>}{preorders.map((item) => <article key={item.id} className="request-review-card"><strong>{item.product.name} · {item.variant.name} · {item.quantity.toString()}</strong><p>{item.customerName} · {item.customerPhone}</p><p>{item.status.replaceAll("_", " ")}</p><p className="whitespace-pre-wrap">{item.notes}</p>{item.status === "PENDING_APPROVAL" && <RequestReview id={item.id} kind="preorder" updatedAt={item.updatedAt.toISOString()} fee="" notes=""/>}</article>)}</section>}</div>
    <nav className="mt-6 flex gap-6" aria-label="Request pages">{page > 1 && <a href={`/admin/requests?page=${page - 1}`}>Previous</a>}<span>Page {page}</span>{Math.max(quoteCount, preorderCount) > page * take && <a href={`/admin/requests?page=${page + 1}`}>Next</a>}</nav>
  </>;
}
