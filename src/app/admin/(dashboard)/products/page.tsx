import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, PackageSearch, Plus, Search } from "lucide-react";

import { setProductStatusAction, updateProductPriceAction } from "@/features/admin/catalog-actions";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { PublicationStatus, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { formatLkr } from "@/lib/pricing/money";

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  pricing?: string;
  page?: string;
};

function priceInput(value: bigint | null | undefined) {
  return value == null ? "" : (Number(value) / 100).toFixed(2);
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await requireAdminPage("catalog.read");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const take = 10;
  const where: Prisma.ProductWhereInput = {
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { sku: { contains: params.q, mode: "insensitive" } },
            { brand: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(Object.values(PublicationStatus).includes(params.status as PublicationStatus)
      ? { status: params.status as PublicationStatus }
      : {}),
    ...(params.category ? { categoryId: params.category } : {}),
    ...(params.pricing === "missing"
      ? { standardPriceMinor: 0n }
      : params.pricing === "priced"
        ? { standardPriceMinor: { gt: 0n } }
        : {}),
  };
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        images: { orderBy: [{ primary: "desc" }, { sortOrder: "asc" }], take: 1 },
        variants: { where: { active: true }, include: { inventory: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: [{ standardPriceMinor: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / take));
  const canWrite = actor.permissions.has("catalog.write");

  return <>
    <div className="admin-breadcrumb"><Link href="/admin">Overview</Link><ChevronRight size={12}/><span>Products</span></div>
    <div className="admin-page-heading">
      <div><p className="admin-eyebrow">Inventory report catalogue</p><h1>Products</h1><p>{total} records match the current view. Retail-price changes update the storefront and every active cart.</p></div>
      {canWrite && <Link className="admin-primary-button" href="/admin/products/new"><Plus size={16}/> Add product</Link>}
    </div>
    <form className="admin-filterbar">
      <label><Search size={16}/><input name="q" defaultValue={params.q} placeholder="Search name, SKU or brand…"/></label>
      <select name="pricing" defaultValue={params.pricing}><option value="">All prices</option><option value="missing">Needs retail price</option><option value="priced">Retail price ready</option></select>
      <select name="status" defaultValue={params.status}><option value="">All statuses</option>{Object.values(PublicationStatus).map((item) => <option key={item}>{item}</option>)}</select>
      <select name="category" defaultValue={params.category}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button>Apply filters</button>
    </form>
    <section className="admin-table-card">
      <div className="admin-table-scroll"><table className="admin-product-table">
        <thead><tr><th>Product</th><th>Category</th><th>Retail price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{products.map((product) => {
          const image = product.images[0];
          const variant = product.variants[0];
          const inventory = variant?.inventory;
          const available = Number(inventory?.quantityOnHand ?? 0) - Number(inventory?.quantityReserved ?? 0);
          const effectiveStandard = variant?.priceOverrideMinor ?? product.standardPriceMinor;
          const effectiveLoyalty = variant?.loyaltyPriceMinor ?? product.loyaltyPriceMinor;
          return <tr key={product.id}>
            <td><div className="admin-product-cell">{image ? <Image src={image.url} alt="" width={48} height={48} unoptimized/> : <span><PackageSearch size={18}/></span>}<div><Link href={`/admin/products/${product.id}`}>{product.name}</Link><small>{product.sku} · {product.brand?.name ?? "Unbranded"}</small></div></div></td>
            <td>{product.category.name}</td>
            <td>{canWrite ? <details className={`admin-price-editor ${effectiveStandard === 0n ? "is-missing" : ""}`}>
              <summary><strong>{effectiveStandard > 0n ? formatLkr(effectiveStandard) : "Needs price"}</strong>{effectiveLoyalty != null && <small>Loyalty {formatLkr(effectiveLoyalty)}</small>}{variant?.priceOverrideMinor != null && <small>Default variant override</small>}</summary>
              <form action={updateProductPriceAction}>
                <input type="hidden" name="productId" value={product.id}/>
                <input type="hidden" name="expectedUpdatedAt" value={product.updatedAt.toISOString()}/>
                <label>Retail price (LKR)<input name="standardPrice" inputMode="decimal" defaultValue={priceInput(effectiveStandard)} required/></label>
                <label>Loyalty price (LKR)<input name="loyaltyPrice" inputMode="decimal" defaultValue={priceInput(effectiveLoyalty)}/></label>
                <label>Reason<input name="priceReason" defaultValue={effectiveStandard === 0n ? "Verified retail price added" : "Retail price update"} minLength={3} maxLength={240} required/></label>
                <button>Save price</button>
              </form>
            </details> : <><strong>{effectiveStandard > 0n ? formatLkr(effectiveStandard) : "Needs price"}</strong>{effectiveLoyalty != null && <small>Loyalty {formatLkr(effectiveLoyalty)}</small>}</>}</td>
            <td><span className={available <= Number(inventory?.lowStockThreshold ?? 0) ? "admin-stock-low" : "admin-stock-ok"}>{available.toFixed(3).replace(/\.000$/, "")} available</span></td>
            <td><span className={`admin-status admin-status-${product.status.toLowerCase()}`}>{product.status}</span></td>
            <td><div className="admin-row-actions"><Link href={`/admin/products/${product.id}`}>Full edit</Link>{canWrite && <form action={setProductStatusAction}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="status" value={product.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED"}/><button>{product.status === "ARCHIVED" ? "Restore" : "Archive"}</button></form>}</div></td>
          </tr>;
        })}</tbody>
      </table></div>
      {!products.length && <div className="admin-empty-state"><PackageSearch size={26}/><strong>No products found</strong><p>Try a broader search or create a new catalogue record.</p></div>}
      <footer className="admin-table-footer"><span>Page {page} of {pageCount}</span><div>{page > 1 && <Link href={{ query: { ...params, page: page - 1 } }}><ArrowLeft size={14}/> Previous</Link>}{page < pageCount && <Link href={{ query: { ...params, page: page + 1 } }}>Next <ArrowRight size={14}/></Link>}</div></footer>
    </section>
  </>;
}
