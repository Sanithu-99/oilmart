"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAudit } from "@/features/admin/audit";
import { requireAdmin } from "@/features/admin/auth/authorization";
import { db } from "@/lib/db/client";
import { removeProductImage, storeProductImage } from "@/lib/storage/product-images";

const MAX_BATCH_FILES = 8;

export async function uploadProductImageAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const productId = z.string().min(1).parse(form.get("productId"));
  const customAltText = z.string().trim().max(160).parse(String(form.get("altText") ?? ""));
  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) throw new Error("Choose at least one product photo");
  if (files.length > MAX_BATCH_FILES) throw new Error(`Upload no more than ${MAX_BATCH_FILES} photos at a time`);
  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, select: { id: true, name: true } });
  const storedFiles: Awaited<ReturnType<typeof storeProductImage>>[] = [];
  try {
    for (const file of files) storedFiles.push(await storeProductImage(productId, file));
    await db.$transaction(async (tx) => {
      const existing = await tx.productImage.findMany({ where: { productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      const nextSortOrder = (existing.at(-1)?.sortOrder ?? -1) + 1;
      const hasPrimary = existing.some((image) => image.primary);
      for (const [index, stored] of storedFiles.entries()) {
        const image = await tx.productImage.create({
          data: {
            productId,
            altText: customAltText ? `${customAltText}${files.length > 1 ? ` — view ${index + 1}` : ""}` : `${product.name} — product view ${nextSortOrder + index + 1}`,
            ...stored,
            sortOrder: nextSortOrder + index,
            primary: !hasPrimary && index === 0,
          },
        });
        await writeAudit(tx, actor, { action: "PRODUCT_IMAGE_UPLOADED", entityType: "ProductImage", entityId: image.id, after: image });
      }
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    await Promise.allSettled(storedFiles.map((stored) => removeProductImage(stored.storageKey)));
    throw error;
  }
  revalidatePath("/admin/products", "layout");
  redirect(`/admin/products/${productId}?images=uploaded&count=${storedFiles.length}`);
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
    const remaining = await tx.productImage.findMany({ where: { productId: image.productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
    for (const [sortOrder, item] of remaining.entries()) await tx.productImage.update({ where: { id: item.id }, data: { sortOrder } });
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

export async function moveProductImageAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const imageId = z.string().min(1).parse(form.get("imageId"));
  const direction = z.enum(["up", "down"]).parse(form.get("direction"));
  const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId }, select: { id: true, productId: true } });

  await db.$transaction(async (tx) => {
    const ordered = await tx.productImage.findMany({ where: { productId: image.productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, sortOrder: true } });
    const index = ordered.findIndex((item) => item.id === image.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    const target = ordered[targetIndex];
    const current = ordered[index];
    // A temporary negative position avoids transient equal ordering and keeps the swap explicit.
    await tx.productImage.update({ where: { id: current.id }, data: { sortOrder: -1 } });
    await tx.productImage.update({ where: { id: target.id }, data: { sortOrder: current.sortOrder } });
    await tx.productImage.update({ where: { id: current.id }, data: { sortOrder: target.sortOrder } });
    await writeAudit(tx, actor, { action: "PRODUCT_IMAGE_REORDERED", entityType: "ProductImage", entityId: image.id, metadata: { direction } });
  }, { isolationLevel: "Serializable" });

  revalidatePath("/admin/products", "layout");
  redirect(`/admin/products/${image.productId}?image=reordered`);
}
