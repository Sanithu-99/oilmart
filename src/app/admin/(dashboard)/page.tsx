import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleAlert, Clock3, Package, ShoppingBag, TrendingUp } from "lucide-react";

import { PaymentStatus, PublicationStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { formatLkr } from "@/lib/pricing/money";

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const forbidden = (await searchParams).forbidden === "1";
  const [productCount, activeProducts, payments, orders, inventory, pendingPreOrders, pendingQuotes, activity] = await Promise.all([
    db.product.count(), db.product.count({ where: { status: PublicationStatus.ACTIVE } }),
    db.payment.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amountMinor: true }, _count: true }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.inventory.findMany({ include: { variant: { include: { product: true } } } }),
    db.preOrder.count({ where: { status: "PENDING_APPROVAL" } }), db.quotation.count({ where: { status: "REQUESTED" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  const lowStock = inventory.filter((item) => Number(item.quantityOnHand) - Number(item.quantityReserved) <= Number(item.lowStockThreshold));
  const revenue = payments._sum.amountMinor ?? 0n;
  return <>
    {forbidden && <div className="admin-forbidden" role="alert">Your role does not permit that administrative area.</div>}
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Thursday · Operations desk</p><h1>Good morning.</h1><p>Here is the latest picture of your store, based on live database records.</p></div><Link className="admin-primary-button" href="/admin/products/new">Add product <ArrowRight size={16}/></Link></div>
    <section className="admin-stat-grid" aria-label="Store metrics">
      <article><span><TrendingUp/></span><p>Paid revenue</p><strong>{formatLkr(revenue)}</strong><small>{payments._count} verified payments</small></article>
      <article><span><ShoppingBag/></span><p>Recent orders</p><strong>{orders.length}</strong><small>Latest activity window</small></article>
      <article><span><Package/></span><p>Active catalogue</p><strong>{activeProducts}<em> / {productCount}</em></strong><small>Published products</small></article>
      <article className={lowStock.length ? "is-warning" : ""}><span><CircleAlert/></span><p>Stock attention</p><strong>{lowStock.length}</strong><small>At or below threshold</small></article>
    </section>
    <section className="admin-dashboard-grid"><article className="admin-panel admin-task-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Priority queue</p><h2>Needs attention</h2></div><Clock3 size={19}/></div>{lowStock.slice(0, 4).map((item) => <Link key={item.id} href="/admin/inventory"><span className="admin-task-icon"><CircleAlert size={17}/></span><div><strong>{item.variant.product.name}</strong><small>{item.variant.sku} · {item.quantityOnHand.toString()} available</small></div><ArrowRight size={15}/></Link>)}{!lowStock.length && <div className="admin-empty-inline"><BadgeCheck size={20}/> All stock levels are above their thresholds.</div>}<div className="admin-mini-stats"><span><strong>{pendingPreOrders}</strong> pre-orders pending</span><span><strong>{pendingQuotes}</strong> quotes requested</span></div></article>
    <article className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Accountability</p><h2>Recent activity</h2></div><Link href="/admin/audit">View log</Link></div><div className="admin-activity-list">{activity.map((event) => <div key={event.id}><span>{event.action.slice(0,1)}</span><p><strong>{event.action.replaceAll("_", " ").toLowerCase()}</strong><small>{event.actor?.name ?? event.actor?.email ?? "System"} · {event.createdAt.toLocaleString("en-LK")}</small></p></div>)}{!activity.length && <div className="admin-empty-inline">No administrative changes recorded yet.</div>}</div></article></section>
  </>;
}
