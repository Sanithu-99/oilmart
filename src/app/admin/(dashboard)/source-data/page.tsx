import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, FileSearch, Search } from "lucide-react";

import { requireAdminPage } from "@/features/admin/auth/authorization";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { vehicleApplicationName } from "@/lib/catalog/applications";
import { formatLkr } from "@/lib/pricing/money";

type SearchParams = { source?: string; group?: string; q?: string; page?: string };

function pageHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, page: String(page) })) if (value) query.set(key, value);
  return `/admin/source-data?${query.toString()}`;
}

export default async function SourceDataPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("catalog.read");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const take = 20;
  const sources = await db.catalogueSource.findMany({ orderBy: { effectiveDate: "desc" }, include: { _count: { select: { items: true } } } });
  const source = sources.find((item) => item.key === params.source) ?? sources[0] ?? null;
  const where: Prisma.SourceCatalogueItemWhereInput = {
    ...(source ? { sourceId: source.id } : {}),
    ...(params.group ? { sourceCategory: params.group } : {}),
    ...(params.q ? { OR: [
      { name: { contains: params.q, mode: "insensitive" } },
      { materialCode: { contains: params.q, mode: "insensitive" } },
      { matchedProduct: { name: { contains: params.q, mode: "insensitive" } } },
      { matchedProduct: { sku: { contains: params.q, mode: "insensitive" } } },
    ] } : {}),
  };
  const [items, total, groups, matchedCount, retailCount] = await Promise.all([
    db.sourceCatalogueItem.findMany({
      where,
      include: { matchedProduct: { select: { id: true, sku: true, name: true } } },
      orderBy: [{ sourcePage: "asc" }, { sourceRow: "asc" }],
      skip: (page - 1) * take,
      take,
    }),
    db.sourceCatalogueItem.count({ where }),
    source ? db.sourceCatalogueItem.groupBy({ by: ["sourceCategory"], where: { sourceId: source.id, sourceCategory: { not: null } }, orderBy: { sourceCategory: "asc" } }) : [],
    source ? db.sourceCatalogueItem.count({ where: { sourceId: source.id, matchedProductId: { not: null } } }) : 0,
    source ? db.sourceCatalogueItem.count({ where: { sourceId: source.id, retailPriceMinor: { not: null } } }) : 0,
  ]);
  const pageCount = Math.max(1, Math.ceil(total / take));

  return <>
    <div className="admin-breadcrumb"><Link href="/admin">Overview</Link><ChevronRight size={12}/><span>Source data</span></div>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Document-backed catalogue</p><h1>Source data</h1><p>Every retained row from the inventory report and Caltex revision, with exact document provenance and conservative product matching.</p></div></div>

    <section className="admin-source-summary-grid" aria-label="Imported source documents">
      {sources.map((item) => <Link key={item.id} className={item.id === source?.id ? "is-active" : ""} href={`/admin/source-data?source=${item.key}`}>
        <FileSearch size={18}/><div><strong>{item.title}</strong><span>{item._count.items} rows · {item.pageCount} pages</span><small>{item.effectiveDate?.toLocaleDateString("en-LK", { dateStyle: "medium" }) ?? "No effective date"}</small></div>
      </Link>)}
    </section>

    {source && <aside className="admin-source-policy"><strong>Retail-only price policy</strong><p>{source.retainedPriceColumn ? `${source.retainedPriceColumn} is the only imported selling price.` : "This source does not provide a retained selling price."} {source.excludedColumns.length > 0 && `${source.excludedColumns.join(" and ")} are deliberately excluded from the database and every interface.`}</p><span>{matchedCount} source rows linked to stocked products · {retailCount} rows with retail prices</span></aside>}

    <form noValidate className="admin-filterbar admin-source-filter">
      <label><Search size={16}/><input name="q" defaultValue={params.q} placeholder="Search source item, code, product or SKU…"/></label>
      <select name="source" defaultValue={source?.key}>{sources.map((item) => <option key={item.id} value={item.key}>{item.title}</option>)}</select>
      <select name="group" defaultValue={params.group}><option value="">All source groups</option>{groups.flatMap((item) => item.sourceCategory ? [<option key={item.sourceCategory} value={item.sourceCategory}>{item.sourceCategory}</option>] : [])}</select>
      <button>Apply filters</button>
    </form>

    <section className="admin-table-card">
      <div className="admin-table-scroll"><table className="admin-product-table admin-source-table">
        <thead><tr><th>Source item</th><th>Vehicle / application</th><th>Pack / quantity</th><th>Retail price</th><th>Stocked product match</th><th>Document</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td><strong>{item.name}</strong>{item.materialCode && <code>{item.materialCode}</code>}{item.specification && <details><summary>Product specification</summary><p>{item.specification}</p></details>}</td>
          <td><strong>{item.applicationSlug ? vehicleApplicationName(item.applicationSlug) : "Not classified"}</strong><small>{item.sourceCategory}</small></td>
          <td><strong>{item.packSize ?? (item.quantity != null ? `${item.quantity.toString()} ${item.unit ?? "units"}` : "—")}</strong></td>
          <td>{item.retailPriceMinor != null ? <strong>{formatLkr(item.retailPriceMinor)}</strong> : <small>Not supplied</small>}</td>
          <td>{item.matchedProduct ? <Link href={`/admin/products/${item.matchedProduct.id}`}><strong>{item.matchedProduct.name}</strong><small>{item.matchedProduct.sku}</small></Link> : <small>Source record only</small>}</td>
          <td><strong>Page {item.sourcePage ?? "—"}</strong><small>Row {item.sourceRow ?? "—"}</small></td>
        </tr>)}</tbody>
      </table></div>
      {!items.length && <div className="admin-empty-state"><FileSearch size={26}/><strong>No source rows found</strong><p>Try a broader search or another document group.</p></div>}
      <footer className="admin-table-footer"><span>{total} rows · Page {page} of {pageCount}</span><div>{page > 1 && <Link href={pageHref(params, page - 1)}><ArrowLeft size={14}/> Previous</Link>}{page < pageCount && <Link href={pageHref(params, page + 1)}>Next <ArrowRight size={14}/></Link>}</div></footer>
    </section>
  </>;
}
