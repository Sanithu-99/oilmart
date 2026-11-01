"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAudit } from "@/features/admin/audit";
import { requireAdmin } from "@/features/admin/auth/authorization";
import { db } from "@/lib/db/client";
import { removeProductImage, storeProductImage } from "@/lib/storage/product-images";

export async function uploadProductImageAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const productId = z.string().min(1).parse(form.get("productId"));
  const altText = z.string().trim().min(3).max(200).parse(form.get("altText"));
  const file = form.get("image");
  if (!(file instanceof File)) throw new Error("Choose an image to upload");
  await db.product.findUniqueOrThrow({ where: { id: productId }, select: { id: true } });
  const stored = await storeProductImage(productId, file);
  try {
    await db.$transaction(async (tx) => {
      const count = await tx.productImage.count({ where: { productId } });
      const image = await tx.productImage.create({ data: { productId, altText, ...stored, sortOrder: count, primary: count === 0 } });
      await writeAudit(tx, actor, { action: "PRODUCT_IMAGE_UPLOADED", entityType: "ProductImage", entityId: image.id, after: image });
    });
  } catch (error) {
    await removeProductImage(stored.storageKey);
    throw error;
  }
  revalidatePath("/admin/products", "layout");
  redirect(`/admin/products/${productId}?image=uploaded`);
}

export async function deleteProductImageAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const imageId = z.string().min(1).parse(form.get("imageId"));
  const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });
  await db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    if (image.primary) {
      const next = await tx.productImage.findFirst({ where: { productId: image.productId }, orderBy: { sortOrder: "asc" } });
      if (next) await tx.productImage.update({ where: { id: next.id }, data: { primary: true } });
    }
    await writeAudit(tx, actor, { action: "PRODUCT_IMAGE_DELETED", entityType: "ProductImage", entityId: image.id, before: image });
  });
  await removeProductImage(image.storageKey);
  revalidatePath("/admin/products", "layout");
  redirect(`/admin/products/${image.productId}?image=deleted`);
}

export async function setPrimaryProductImageAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const imageId = z.string().min(1).parse(form.get("imageId"));
  const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });
  await db.$transaction(async (tx) => {
    await tx.productImage.updateMany({ where: { productId: image.productId }, data: { primary: false } });
    await tx.productImage.update({ where: { id: image.id }, data: { primary: true } });
    await writeAudit(tx, actor, { action: "PRODUCT_IMAGE_PRIMARY_CHANGED", entityType: "ProductImage", entityId: image.id });
  });
  revalidatePath("/admin/products", "layout");
  redirect(`/admin/products/${image.productId}?image=primary`);
}
