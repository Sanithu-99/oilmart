"use server";

import Decimal from "decimal.js";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/features/admin/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import {
  DiscountScope,
  InventoryAdjustmentType,
  Locale,
  ProductType,
  PromotionType,
  PublicationStatus,
  UnitOfSale,
} from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { VEHICLE_APPLICATION_SLUGS } from "@/lib/catalog/applications";

const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const required = z.string().trim().min(1).max(500);
const optional = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function optionalJson(value: string) {
  if (!value) return undefined;
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Technical specifications must be a JSON object");
  return parsed;
}

function moneyMinor(value: string) {
  const amount = new Decimal(value || "0");
  if (!amount.isFinite() || amount.isNegative() || amount.decimalPlaces() > 2) throw new Error("Price must be a non-negative amount with at most two decimals");
  return BigInt(amount.mul(100).toFixed(0));
}

function revalidateCommerce(slug?: string) {
  for (const locale of ["en", "si", "ta"]) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/products`);
    revalidatePath(`/${locale}/cart`);
    if (slug) revalidatePath(`/${locale}/products/${slug}`);
  }
  revalidatePath("/admin", "layout");
}

const productSchema = z.object({
  id: z.string().optional(),
  sku: required,
  slug,
  name: required,
  categoryId: z.string().min(1),
  brandId: z.string().optional(),
  status: z.enum(PublicationStatus),
  type: z.enum(ProductType),
  unitOfSale: z.enum(UnitOfSale),
});

export async function saveProductAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const parsed = productSchema.parse({
    id: text(form, "id") || undefined,
    sku: text(form, "sku"),
    slug: text(form, "slug"),
    name: text(form, "name"),
    categoryId: text(form, "categoryId"),
    brandId: text(form, "brandId") || undefined,
    status: text(form, "status"),
    type: text(form, "type"),
    unitOfSale: text(form, "unitOfSale"),
  });
  const standardPriceMinor = moneyMinor(text(form, "standardPrice"));
  const loyaltyPriceMinor = null;
  const vehicleApplications = z.array(z.enum(VEHICLE_APPLICATION_SLUGS)).parse(form.getAll("vehicleApplications"));
  const translations = [Locale.SI, Locale.TA].flatMap((locale) => {
    const prefix = locale.toLowerCase();
    const name = text(form, `${prefix}Name`);
    return name
      ? [{ locale, name, shortDescription: optional(form, `${prefix}ShortDescription`), description: optional(form, `${prefix}Description`) }]
      : [];
  });

  const savedProduct = await db.$transaction(async (tx) => {
    const before = parsed.id ? await tx.product.findUnique({ where: { id: parsed.id } }) : null;
    const data = {
      sku: parsed.sku,
      slug: parsed.slug,
      name: parsed.name,
      shortDescription: optional(form, "shortDescription"),
      description: optional(form, "description"),
      technicalSpecs: optionalJson(text(form, "technicalSpecs")),
      seoTitle: optional(form, "seoTitle"),
      seoDescription: optional(form, "seoDescription"),
      categoryId: parsed.categoryId,
      brandId: parsed.brandId ?? null,
      standardPriceMinor,
      loyaltyPriceMinor,
      vehicleApplications,
      status: parsed.status,
      type: parsed.type,
      unitOfSale: parsed.unitOfSale,
      featured: form.get("featured") === "on",
      acceptsPreOrders: form.get("acceptsPreOrders") === "on",
    };
    const product = parsed.id
      ? await tx.product.update({ where: { id: parsed.id }, data })
      : await tx.product.create({ data });

    if (!parsed.id) {
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: `${parsed.sku}-DEFAULT`,
          name: "Default",
          minQuantity: text(form, "minQuantity") || "1",
          quantityStep: text(form, "quantityStep") || "1",
        },
      });
      await tx.inventory.create({ data: { variantId: variant.id, lowStockThreshold: text(form, "lowStockThreshold") || "3" } });
    } else {
      const variant = await tx.productVariant.findFirst({ where: { productId: product.id }, orderBy: { sortOrder: "asc" } });
      if (variant) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { minQuantity: text(form, "minQuantity") || "1", quantityStep: text(form, "quantityStep") || "1" },
        });
        if (text(form, "lowStockThreshold")) {
          await tx.inventory.updateMany({ where: { variantId: variant.id }, data: { lowStockThreshold: text(form, "lowStockThreshold") } });
        }
      }
    }

    for (const translation of translations) {
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale: translation.locale } },
        create: { productId: product.id, ...translation },
        update: translation,
      });
    }
    if (parsed.type === ProductType.LOOSE_OIL) {
      const minPurchaseQuantity = text(form, "looseMinQuantity") || "0.5";
      const purchaseIncrement = text(form, "looseIncrement") || "0.5";
      const predefinedQuantities = text(form, "loosePredefined").split(",").map((item) => item.trim()).filter(Boolean);
      await tx.looseOilConfig.upsert({
        where: { productId: product.id },
        create: { productId: product.id, grade: optional(form, "looseGrade"), measurementLabel: text(form, "looseMeasurementLabel") || "Litres", minPurchaseQuantity, purchaseIncrement, predefinedQuantities },
        update: { grade: optional(form, "looseGrade"), measurementLabel: text(form, "looseMeasurementLabel") || "Litres", minPurchaseQuantity, purchaseIncrement, predefinedQuantities },
      });
    } else {
      await tx.looseOilConfig.deleteMany({ where: { productId: product.id } });
    }
    if (before && before.slug !== product.slug) {
      await tx.slugRedirect.upsert({
        where: { entityType_fromSlug: { entityType: "product", fromSlug: before.slug } },
        create: { entityType: "product", fromSlug: before.slug, toSlug: product.slug },
        update: { toSlug: product.slug },
      });
    }
    const priceChanged = !before || before.standardPriceMinor !== standardPriceMinor || before.loyaltyPriceMinor !== loyaltyPriceMinor;
    const priceReason = text(form, "priceReason");
    if (before && priceChanged && !priceReason) throw new Error("A reason is required when changing a retail price");
    if (priceChanged) {
      await tx.priceHistory.create({
        data: { productId: product.id, actorId: actor.id, standardPriceMinor, loyaltyPriceMinor, reason: priceReason || "Initial price" },
      });
    }
    await writeAudit(tx, actor, { action: before ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", entityType: "Product", entityId: product.id, before, after: product });
    return { id: product.id, slug: product.slug };
  });
  revalidateCommerce(savedProduct.slug);
  redirect(`/admin/products/${savedProduct.id}?saved=1`);
}

export async function updateProductPriceAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const productId = z.string().min(1).parse(form.get("productId"));
  const expectedUpdatedAt = z.coerce.date().parse(form.get("expectedUpdatedAt"));
  const standardPriceMinor = moneyMinor(text(form, "standardPrice"));
  const loyaltyPriceMinor = null;
  const reason = z.string().trim().min(3).max(240).parse(form.get("priceReason"));

  const product = await db.$transaction(async (tx) => {
    const before = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    const updated = await tx.product.updateMany({
      where: { id: productId, updatedAt: expectedUpdatedAt },
      data: { standardPriceMinor, loyaltyPriceMinor },
    });
    if (updated.count !== 1) throw new Error("This product changed while you were editing it. Reload and try again.");
    const defaultVariant = before.variants[0];
    if (defaultVariant && (defaultVariant.priceOverrideMinor != null || defaultVariant.loyaltyPriceMinor != null)) {
      await tx.productVariant.update({
        where: { id: defaultVariant.id },
        data: {
          ...(defaultVariant.priceOverrideMinor != null ? { priceOverrideMinor: standardPriceMinor } : {}),
          ...(defaultVariant.loyaltyPriceMinor != null ? { loyaltyPriceMinor } : {}),
        },
      });
    }
    const after = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const priceChanged = before.standardPriceMinor !== standardPriceMinor || before.loyaltyPriceMinor !== loyaltyPriceMinor;
    if (priceChanged) {
      await tx.priceHistory.create({
        data: { productId, actorId: actor.id, standardPriceMinor, loyaltyPriceMinor, reason },
      });
      await writeAudit(tx, actor, {
        action: "PRODUCT_PRICE_UPDATED",
        entityType: "Product",
        entityId: productId,
        before: { standardPriceMinor: before.standardPriceMinor, loyaltyPriceMinor: before.loyaltyPriceMinor },
        after: { standardPriceMinor, loyaltyPriceMinor },
        metadata: { reason, source: "admin-quick-price", propagatedVariantId: defaultVariant?.id ?? null },
      });
    }
    return after;
  }, { isolationLevel: "Serializable" });

  revalidateCommerce(product.slug);
  refresh();
}

export async function setProductStatusAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const id = z.string().min(1).parse(form.get("id"));
  const status = z.enum(PublicationStatus).parse(form.get("status"));
  await db.$transaction(async (tx) => {
    const before = await tx.product.findUniqueOrThrow({ where: { id } });
    const after = await tx.product.update({ where: { id }, data: { status } });
    await writeAudit(tx, actor, { action: "PRODUCT_STATUS_CHANGED", entityType: "Product", entityId: id, before, after });
  });
  revalidateCommerce();
  redirect("/admin/products?updated=1");
}

export async function setRelatedProductsAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const sourceProductId = z.string().min(1).parse(form.get("id"));
  const targetIds = form.getAll("relatedProductIds").map(String).filter((id) => id !== sourceProductId);
  await db.$transaction(async (tx) => {
    const before = await tx.relatedProduct.findMany({ where: { sourceProductId } });
    await tx.relatedProduct.deleteMany({ where: { sourceProductId } });
    if (targetIds.length) await tx.relatedProduct.createMany({ data: targetIds.map((targetProductId, sortOrder) => ({ sourceProductId, targetProductId, sortOrder })) });
    await writeAudit(tx, actor, { action: "RELATED_PRODUCTS_UPDATED", entityType: "Product", entityId: sourceProductId, before, after: targetIds });
  });
  revalidateCommerce();
  redirect(`/admin/products/${sourceProductId}?related=1`);
}

export async function saveVariantAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const productId = z.string().min(1).parse(form.get("productId"));
  const variantId = text(form, "variantId") || undefined;
  const override = text(form, "priceOverride");
  const attributes = optionalJson(text(form, "attributes"));
  const data = {
    productId,
    sku: required.parse(form.get("variantSku")),
    name: required.parse(form.get("variantName")),
    attributes,
    priceOverrideMinor: override ? moneyMinor(override) : null,
    loyaltyPriceMinor: null,
    minQuantity: text(form, "variantMinQuantity") || "1",
    quantityStep: text(form, "variantQuantityStep") || "1",
    sortOrder: Number(text(form, "variantSortOrder") || 0),
    active: form.get("variantActive") === "on",
  };
  await db.$transaction(async (tx) => {
    const before = variantId ? await tx.productVariant.findFirst({ where: { id: variantId, productId } }) : null;
    const variant = variantId
      ? await tx.productVariant.update({ where: { id: variantId }, data })
      : await tx.productVariant.create({ data });
    if (!variantId) await tx.inventory.create({ data: { variantId: variant.id, lowStockThreshold: text(form, "variantLowStockThreshold") || "3" } });
    await writeAudit(tx, actor, { action: before ? "PRODUCT_VARIANT_UPDATED" : "PRODUCT_VARIANT_CREATED", entityType: "ProductVariant", entityId: variant.id, before, after: variant });
  });
  revalidateCommerce();
  redirect(`/admin/products/${productId}?variant=saved`);
}

export async function adjustInventoryAction(form: FormData) {
  const actor = await requireAdmin("inventory.adjust");
  const inventoryId = z.string().min(1).parse(form.get("inventoryId"));
  const delta = new Decimal(text(form, "quantityDelta"));
  const reason = required.parse(form.get("reason"));
  const type = z.enum(InventoryAdjustmentType).parse(form.get("type"));
  if (!delta.isFinite() || delta.isZero() || delta.decimalPlaces() > 3) throw new Error("Adjustment must be a non-zero quantity with at most three decimals");

  await db.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUniqueOrThrow({ where: { id: inventoryId } });
    const before = new Decimal(inventory.quantityOnHand.toString());
    const after = before.plus(delta);
    if (after.isNegative()) throw new Error("Inventory cannot become negative");
    const updated = await tx.inventory.updateMany({
      where: { id: inventory.id, version: inventory.version },
      data: { quantityOnHand: after.toString(), version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new Error("Inventory changed concurrently. Reload and retry.");
    const adjustment = await tx.inventoryAdjustment.create({
      data: { inventoryId, type, quantityDelta: delta.toString(), quantityBefore: before.toString(), quantityAfter: after.toString(), reason, actorId: actor.id },
    });
    await writeAudit(tx, actor, { action: "INVENTORY_ADJUSTED", entityType: "Inventory", entityId: inventoryId, before: { quantityOnHand: before.toString() }, after: { quantityOnHand: after.toString() }, metadata: { adjustmentId: adjustment.id, reason, type } });
  }, { isolationLevel: "Serializable" });
  revalidateCommerce();
  redirect("/admin/inventory?adjusted=1");
}

export async function saveCategoryAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const id = text(form, "id") || undefined;
  const data = {
    slug: slug.parse(form.get("slug")),
    name: required.parse(form.get("name")),
    description: optional(form, "description"),
    imageUrl: optional(form, "imageUrl"),
    seoTitle: optional(form, "seoTitle"),
    seoDescription: optional(form, "seoDescription"),
    parentId: text(form, "parentId") || null,
    sortOrder: Number(text(form, "sortOrder") || 0),
    status: z.enum(PublicationStatus).parse(form.get("status")),
  };
  await db.$transaction(async (tx) => {
    const before = id ? await tx.category.findUnique({ where: { id } }) : null;
    const category = id ? await tx.category.update({ where: { id }, data }) : await tx.category.create({ data });
    if (before && before.slug !== category.slug) {
      await tx.slugRedirect.upsert({ where: { entityType_fromSlug: { entityType: "category", fromSlug: before.slug } }, create: { entityType: "category", fromSlug: before.slug, toSlug: category.slug }, update: { toSlug: category.slug } });
    }
    for (const locale of [Locale.SI, Locale.TA]) {
      const prefix = locale.toLowerCase();
      const name = text(form, `${prefix}Name`);
      if (name) await tx.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: category.id, locale } }, create: { categoryId: category.id, locale, name, description: optional(form, `${prefix}Description`) }, update: { name, description: optional(form, `${prefix}Description`) } });
    }
    await writeAudit(tx, actor, { action: before ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", entityType: "Category", entityId: category.id, before, after: category });
  });
  revalidateCommerce();
  redirect("/admin/categories?saved=1");
}

export async function saveBrandAction(form: FormData) {
  const actor = await requireAdmin("catalog.write");
  const id = text(form, "id") || undefined;
  const data = { slug: slug.parse(form.get("slug")), name: required.parse(form.get("name")), description: optional(form, "description"), logoUrl: optional(form, "logoUrl"), websiteUrl: optional(form, "websiteUrl"), sortOrder: Number(text(form, "sortOrder") || 0), status: z.enum(PublicationStatus).parse(form.get("status")) };
  await db.$transaction(async (tx) => {
    const before = id ? await tx.brand.findUnique({ where: { id } }) : null;
    const brand = id ? await tx.brand.update({ where: { id }, data }) : await tx.brand.create({ data });
    await writeAudit(tx, actor, { action: before ? "BRAND_UPDATED" : "BRAND_CREATED", entityType: "Brand", entityId: brand.id, before, after: brand });
  });
  revalidateCommerce();
  redirect("/admin/brands?saved=1");
}

export async function savePromotionAction(form: FormData) {
  const actor = await requireAdmin("promotions.manage");
  const id = text(form, "id") || undefined;
  const type = z.enum(PromotionType).parse(form.get("type"));
  const scope = z.enum([DiscountScope.PRODUCT, DiscountScope.CATEGORY]).parse(form.get("scope"));
  const percentageBasisPoints = type === PromotionType.PERCENTAGE ? Math.round(Number(text(form, "percentage")) * 100) : null;
  const amountMinor = type === PromotionType.PERCENTAGE ? null : moneyMinor(text(form, "amount"));
  if (percentageBasisPoints !== null && (percentageBasisPoints < 1 || percentageBasisPoints > 10_000)) throw new Error("Percentage must be between 0.01 and 100");
  if (amountMinor !== null && amountMinor <= 0n) throw new Error("Promotion amount must be positive");
  const startsAt = text(form, "startsAt") ? new Date(text(form, "startsAt")) : null;
  const endsAt = text(form, "endsAt") ? new Date(text(form, "endsAt")) : null;
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error("End time must be after start time");
  const data = { name: required.parse(form.get("name")), description: optional(form, "description"), type, scope, percentageBasisPoints, amountMinor, loyaltyOnly: form.get("loyaltyOnly") === "on", active: form.get("active") === "on", startsAt, endsAt, priority: Number(text(form, "priority") || 0) };
  await db.$transaction(async (tx) => {
    const before = id ? await tx.promotion.findUnique({ where: { id } }) : null;
    const promotion = id ? await tx.promotion.update({ where: { id }, data }) : await tx.promotion.create({ data });
    await tx.promotionProduct.deleteMany({ where: { promotionId: promotion.id } });
    await tx.promotionCategory.deleteMany({ where: { promotionId: promotion.id } });
    const productIds = form.getAll("productIds").map(String);
    const categoryIds = form.getAll("categoryIds").map(String);
    if (productIds.length) await tx.promotionProduct.createMany({ data: productIds.map((productId) => ({ promotionId: promotion.id, productId })) });
    if (categoryIds.length) await tx.promotionCategory.createMany({ data: categoryIds.map((categoryId) => ({ promotionId: promotion.id, categoryId })) });
    await writeAudit(tx, actor, { action: before ? "PROMOTION_UPDATED" : "PROMOTION_CREATED", entityType: "Promotion", entityId: promotion.id, before, after: promotion });
  });
  revalidateCommerce();
  redirect("/admin/promotions?saved=1");
}

export async function saveHomepageContentAction(form: FormData) {
  const actor = await requireAdmin("content.manage");
  await db.$transaction(async (tx) => {
    for (const locale of [Locale.EN, Locale.SI, Locale.TA]) {
      const prefix = locale.toLowerCase();
      const title = text(form, `${prefix}Title`);
      const body = text(form, `${prefix}Body`);
      if (!title) continue;
      const before = await tx.contentEntry.findUnique({ where: { key_locale: { key: "homepage.hero", locale } } });
      const after = await tx.contentEntry.upsert({ where: { key_locale: { key: "homepage.hero", locale } }, create: { key: "homepage.hero", locale, title, body, status: PublicationStatus.ACTIVE }, update: { title, body, status: PublicationStatus.ACTIVE } });
      await writeAudit(tx, actor, { action: "HOMEPAGE_CONTENT_UPDATED", entityType: "ContentEntry", entityId: after.id, before, after });
    }
  });
  revalidateCommerce();
  redirect("/admin/content?saved=1");
}
