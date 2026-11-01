import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleAlert, Clock3, FileSpreadsheet, Package, Tags, TrendingUp } from "lucide-react";

import { PaymentStatus, PublicationStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { formatLkr } from "@/lib/pricing/money";

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const forbidden = (await searchParams).forbidden === "1";
  const inventoryCatalogueWhere = { status: PublicationStatus.ACTIVE, sku: { startsWith: "INV-" } } as const;
  const [productCount, activeProducts, payments, inventory, pendingPreOrders, pendingQuotes, activity, importedCount, importedPriced, importedWithImages, unpricedProducts] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: PublicationStatus.ACTIVE } }),
    db.payment.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amountMinor: true }, _count: true }),
    db.inventory.findMany({ include: { variant: { include: { product: true } } } }),
    db.preOrder.count({ where: { status: "PENDING_APPROVAL" } }),
    db.quotation.count({ where: { status: "REQUESTED" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { actor: { select: { name: true, email: true } } } }),
    db.product.count({ where: inventoryCatalogueWhere }),
    db.product.count({ where: { ...inventoryCatalogueWhere, standardPriceMinor: { gt: 0n } } }),
    db.product.count({ where: { ...inventoryCatalogueWhere, images: { some: {} } } }),
    db.product.findMany({
      where: { ...inventoryCatalogueWhere, standardPriceMinor: 0n },
      include: { brand: true, variants: { where: { active: true }, include: { inventory: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: [{ variants: { _count: "desc" } }, { name: "asc" }],
      take: 5,
    }),
  ]);
  const lowStock = inventory.filter((item) => Number(item.quantityOnHand) - Number(item.quantityReserved) <= Number(item.lowStockThreshold));
  const revenue = payments._sum.amountMinor ?? 0n;
  const importedMissingPrice = Math.max(0, importedCount - importedPriced);
  const pricingProgress = importedCount ? Math.round((importedPriced / importedCount) * 100) : 0;
  const today = new Intl.DateTimeFormat("en-LK", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return <>
    {forbidden && <div className="admin-forbidden" role="alert">Your role does not permit that administrative area.</div>}
    <div className="admin-page-heading"><div><p className="admin-eyebrow">{today} · Operations desk</p><h1>Store overview.</h1><p>Live stock, pricing and catalogue readiness from the production database.</p></div><Link className="admin-primary-button" href="/admin/products?pricing=missing">Review missing prices <ArrowRight size={16}/></Link></div>
    <section className="admin-stat-grid" aria-label="Store metrics">
      <article><span><TrendingUp/></span><p>Paid revenue</p><strong>{formatLkr(revenue)}</strong><small>{payments._count} verified payments</small></article>
      <article><span><Package/></span><p>Active catalogue</p><strong>{activeProducts}<em> / {productCount}</em></strong><small>Published products</small></article>
      <article className={importedMissingPrice ? "is-warning" : ""}><span><Tags/></span><p>Retail prices ready</p><strong>{importedPriced}<em> / {importedCount}</em></strong><small>{importedMissingPrice} inventory items still need a price</small></article>
      <article className={lowStock.length ? "is-warning" : ""}><span><CircleAlert/></span><p>Stock attention</p><strong>{lowStock.length}</strong><small>At or below threshold</small></article>
    </section>

    <section className="admin-panel admin-import-panel">
      <div className="admin-panel-heading"><div><p className="admin-eyebrow">Inventory Details Report</p><h2>Imported catalogue readiness</h2></div><FileSpreadsheet size={20}/></div>
      <div className="admin-import-overview">
        <div className="admin-import-progress"><div><strong>{pricingProgress}%</strong><span>retail pricing complete</span></div><div className="admin-progress-track" aria-label={`${pricingProgress}% of imported products have a retail price`}><span style={{ width: `${pricingProgress}%` }}/></div><p>The report supplied {importedCount} active inventory products. {importedWithImages} have product imagery and {importedPriced} have verified retail prices.</p><Link href="/admin/products?pricing=missing">Open the pricing queue <ArrowRight size={14}/></Link></div>
        <div className="admin-pricing-queue"><div className="admin-queue-heading"><strong>Next prices to verify</strong><span>{importedMissingPrice} remaining</span></div>{unpricedProducts.map((product) => {
          const inventoryRecord = product.variants[0]?.inventory;
          const available = Number(inventoryRecord?.quantityOnHand ?? 0) - Number(inventoryRecord?.quantityReserved ?? 0);
          return <Link key={product.id} href={`/admin/products/${product.id}`}><div><strong>{product.name}</strong><small>{product.sku} · {product.brand?.name ?? "Unbranded"} · {available.toFixed(3).replace(/\.000$/, "")} in stock</small></div><span>Add price <ArrowRight size={13}/></span></Link>;
        })}{!unpricedProducts.length && <div className="admin-empty-inline"><BadgeCheck size={20}/> Every imported product has a retail price.</div>}</div>
      </div>
    </section>

    <section className="admin-dashboard-grid">
      <article className="admin-panel admin-task-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Priority queue</p><h2>Stock attention</h2></div><Clock3 size={19}/></div>{lowStock.slice(0, 4).map((item) => <Link key={item.id} href="/admin/inventory"><span className="admin-task-icon"><CircleAlert size={17}/></span><div><strong>{item.variant.product.name}</strong><small>{item.variant.sku} · {item.quantityOnHand.toString()} on hand</small></div><ArrowRight size={15}/></Link>)}{!lowStock.length && <div className="admin-empty-inline"><BadgeCheck size={20}/> All stock levels are above their thresholds.</div>}<div className="admin-mini-stats"><span><strong>{pendingPreOrders}</strong> pre-orders pending</span><span><strong>{pendingQuotes}</strong> quotes requested</span></div></article>
      <article className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Accountability</p><h2>Recent activity</h2></div><Link href="/admin/audit">View log</Link></div><div className="admin-activity-list">{activity.map((event) => <div key={event.id}><span>{event.action.slice(0,1)}</span><p><strong>{event.action.replaceAll("_", " ").toLowerCase()}</strong><small>{event.actor?.name ?? event.actor?.email ?? "System"} · {event.createdAt.toLocaleString("en-LK")}</small></p></div>)}{!activity.length && <div className="admin-empty-inline">No administrative changes recorded yet.</div>}</div></article>
    </section>
  </>;
}
