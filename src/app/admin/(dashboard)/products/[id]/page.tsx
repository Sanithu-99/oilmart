import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { db } from "@/lib/db/client";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("catalog.write");
  const { id } = await params;
  const [product, categories, brands, products] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        translations: true,
        variants: { include: { inventory: true }, orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        relatedFrom: true,
        priceHistory: { orderBy: { createdAt: "desc" } },
        sourceCatalogueItems: { include: { source: true }, orderBy: [{ source: { effectiveDate: "desc" } }, { sourcePage: "asc" }] },
        looseOilConfig: true,
      },
    }),
    db.category.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  return <>
    <div className="admin-breadcrumb"><Link href="/admin/products">Products</Link><ChevronRight size={12}/><span>{product.name}</span></div>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Catalogue editor</p><h1>{product.name}</h1><p>Last updated {product.updatedAt.toLocaleString("en-LK")} · {product.status.toLowerCase()}</p></div><Link className="admin-secondary-button" href={`/en/products/${product.slug}`}>View storefront</Link></div>
    <ProductEditor product={product} categories={categories} brands={brands} products={products}/>
  </>;
}
