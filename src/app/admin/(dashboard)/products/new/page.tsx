import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { db } from "@/lib/db/client";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  await requireAdminPage("catalog.write");
  const loose = (await searchParams).template === "loose";
  const [categories, brands, products] = await Promise.all([db.category.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }), db.brand.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }), db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return <><div className="admin-breadcrumb"><Link href="/admin/products">Products</Link><ChevronRight size={12}/><span>New product</span></div><div className="admin-page-heading"><div><p className="admin-eyebrow">New catalogue record</p><h1>{loose ? "Add loose oil." : "Add a product."}</h1><p>Build the record in draft, then publish when its pricing, stock and content are ready.</p></div></div><ProductEditor looseTemplate={loose} categories={categories} brands={brands} products={products}/></>;
}
