import Link from "next/link";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { OrderReview } from "@/components/admin/order-review";
import { db } from "@/lib/db/client";
import { orderInclude } from "@/features/orders/service";
import { formatLkr } from "@/lib/pricing/money";
import type { Prisma } from "@/generated/prisma/client";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const actor = await requireAdminPage("orders.read"), query = await searchParams;
  const page = Math.max(1, Math.floor(Number(query.page) || 1)), take = 12;
  const statuses = ["DRAFT", "PENDING_PAYMENT", "AWAITING_MANUAL_VERIFICATION", "PAID", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"] as const;
  const status = statuses.find((value) => value === query.status);
  const where: Prisma.OrderWhereInput = status ? { status } : {};
  const [orders, count] = await Promise.all([db.order.findMany({ where, include: { ...orderInclude, notes: { where: { internal: false }, orderBy: { createdAt: "desc" }, take: 4 } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }), db.order.count({ where })]);
  return <><header className="admin-page-heading"><div><p className="admin-eyebrow">Stock before payment</p><h1>Orders &amp; payments</h1><p>Confirm stock, verify actual receipt, then prepare the order. Cancelling an unpaid request releases its stock reservation.</p></div></header><form noValidate className="admin-filterbar"><label>Status<select name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label><button>Apply</button></form>
    <div className="grid gap-6 xl:grid-cols-2">{orders.map((order) => <article className="admin-panel" key={order.id}><h2 className="break-all text-lg">{order.orderNumber}</h2><p>{order.customerName} · {order.customerPhone}</p><p className="my-2 font-semibold">{order.status.replaceAll("_", " ")} · {formatLkr(order.totalMinor)}</p><p>{(order.pricingSnapshot as Record<string, unknown>).kind === "QUOTATION_FEE" ? "Quotation preparation fee (not merchandise)" : "Store pickup"}</p><ul className="my-4 space-y-2 text-sm">{order.items.map((item) => <li key={item.id}>{item.quantity.toString()} × {item.productName} · {item.variantName}</li>)}</ul>{order.notes.map((note) => <p key={note.id} className="my-2 whitespace-pre-wrap text-sm">{note.body}</p>)}{actor.permissions.has("orders.manage") && <OrderReview key={order.updatedAt.toISOString()} id={order.id} updatedAt={order.updatedAt.toISOString()} status={order.status} total={order.totalMinor.toString()} feeOrder={(order.pricingSnapshot as Record<string, unknown>).kind === "QUOTATION_FEE"} hosted={order.payments.some((payment) => payment.method === "ONLINE_PROVIDER")}/>}</article>)}</div>{!orders.length && <p className="admin-panel">No orders match this view.</p>}
    <nav className="mt-8 flex gap-6" aria-label="Order pages">{page > 1 && <Link href={`?page=${page - 1}&status=${status ?? ""}`}>Previous</Link>}<span>Page {page} · {count} orders</span>{page * take < count && <Link href={`?page=${page + 1}&status=${status ?? ""}`}>Next</Link>}</nav></>;
}
