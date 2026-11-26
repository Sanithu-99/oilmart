import "server-only";

import Decimal from "decimal.js";

import { CartStatus, LoyaltyStatus, PublicationStatus, type Prisma } from "@/generated/prisma/client";
import { calculatePrice } from "@/features/pricing/service";
import { resolvePromotionUnitPrice } from "@/features/pricing/promotions";
import { db } from "@/lib/db/client";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: { include: { images: { orderBy: [{ primary: "desc" }, { sortOrder: "asc" }], take: 1 } } },
      variant: { include: { inventory: true } },
    },
  },
} satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export type CartIdentity = { guestTokenHash: string; customerId?: never } | { customerId: string; guestTokenHash?: never };

async function loyaltyEligibleFor(customerId: string | null | undefined) {
  if (!customerId) return false;
  const customer = await db.customerProfile.findUnique({
    where: { id: customerId },
    select: { user: { select: { emailVerified: true } }, loyaltyMembership: { select: { status: true, expiresAt: true } } },
  });
  return Boolean(customer?.user.emailVerified && customer.loyaltyMembership?.status === LoyaltyStatus.ACTIVE && (!customer.loyaltyMembership.expiresAt || customer.loyaltyMembership.expiresAt > new Date()));
}

async function presentCart(cart: CartRecord | null) {
  if (!cart) return { id: null, itemCount: 0, items: [], subtotalMinor: "0", totalMinor: "0", currency: "LKR", hasUnavailablePrices: false, cardTotalMinor: "0", cardSurchargeMinor: "0" };
  const loyaltyEligible = await loyaltyEligibleFor(cart.customerId);
  const now = new Date();
  const promotions = await db.promotion.findMany({
    where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    include: { products: true, categories: true },
  });
  const lines = cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity.toString(),
    standardUnitPriceMinor: item.variant.priceOverrideMinor ?? item.product.standardPriceMinor,
    loyaltyUnitPriceMinor: item.variant.loyaltyPriceMinor ?? item.product.loyaltyPriceMinor,
    promotionUnitPriceMinor: resolvePromotionUnitPrice({
      productId: item.productId,
      categoryId: item.product.categoryId,
      baseUnitPriceMinor: loyaltyEligible
        ? item.variant.loyaltyPriceMinor ?? item.product.loyaltyPriceMinor ?? item.variant.priceOverrideMinor ?? item.product.standardPriceMinor
        : item.variant.priceOverrideMinor ?? item.product.standardPriceMinor,
      loyaltyEligible,
      promotions: promotions.map((promotion) => ({ ...promotion, productIds: promotion.products.map((entry) => entry.productId), categoryIds: promotion.categories.map((entry) => entry.categoryId) })),
    })?.unitPriceMinor,
  }));
  const pricing = calculatePrice(lines, { loyaltyEligible });
  const cardPricing = calculatePrice(lines, { loyaltyEligible, paymentMethod: "CARD" });
  const hasUnavailablePrices = lines.some((line) => line.standardUnitPriceMinor <= 0n);
  return {
    id: cart.id,
    currency: cart.currency,
    itemCount: cart.items.reduce((sum, item) => sum + Number(item.quantity.toString()), 0),
    subtotalMinor: pricing.subtotalMinor.toString(),
    totalMinor: pricing.totalMinor.toString(),
    hasUnavailablePrices,
    cardTotalMinor: cardPricing.totalMinor.toString(),
    cardSurchargeMinor: cardPricing.surchargeMinor.toString(),
    items: cart.items.map((item, index) => {
      const available = Math.max(
        0,
        Number(item.variant.inventory?.quantityOnHand.toString() ?? 0) -
          Number(item.variant.inventory?.quantityReserved.toString() ?? 0),
      );
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        slug: item.product.slug,
        name: item.variant.name === "Default" ? item.product.name : `${item.product.name} - ${item.variant.name}`,
        sku: item.variant.sku,
        quantity: item.quantity.toString(),
        quantityStep: item.variant.quantityStep.toString(),
        minQuantity: item.variant.minQuantity.toString(),
        available,
        inStock: available > 0,
        priceAvailable: lines[index]!.standardUnitPriceMinor > 0n,
        standardUnitPriceMinor: (item.variant.priceOverrideMinor ?? item.product.standardPriceMinor).toString(),
        unitPriceMinor: pricing.lines[index]!.unitPriceMinor.toString(),
        priceSource: pricing.lines[index]!.priceSource,
        lineTotalMinor: pricing.lines[index]!.lineTotalMinor.toString(),
        image: item.product.images[0]
          ? { url: item.product.images[0].url, alt: item.product.images[0].altText }
          : null,
      };
    }),
  };
}

export type PresentedCart = Awaited<ReturnType<typeof presentCart>>;

export async function getCartByTokenHash(guestTokenHash: string | null) {
  if (!guestTokenHash) return presentCart(null);
  const cart = await db.cart.findFirst({
    where: { guestTokenHash, status: CartStatus.ACTIVE, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    include: cartInclude,
  });
  return presentCart(cart);
}

export async function getCart(identity: CartIdentity | null) {
  if (!identity) return presentCart(null);
  const cart = await db.cart.findFirst({
    where: {
      ...(identity.customerId ? { customerId: identity.customerId } : { guestTokenHash: identity.guestTokenHash }),
      status: CartStatus.ACTIVE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: cartInclude,
  });
  return presentCart(cart);
}

async function getOrCreateCart(identity: CartIdentity) {
  const existing = await db.cart.findFirst({ where: { ...(identity.customerId ? { customerId: identity.customerId } : { guestTokenHash: identity.guestTokenHash }), status: CartStatus.ACTIVE } });
  if (existing) return existing;
  return db.cart.create({
    data: { ...(identity.customerId ? { customerId: identity.customerId } : { guestTokenHash: identity.guestTokenHash }), status: CartStatus.ACTIVE, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });
}

export async function addCartItem(identity: CartIdentity, variantId: string, quantityInput: string) {
  const quantity = new Decimal(quantityInput);
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, active: true, product: { status: PublicationStatus.ACTIVE } },
    include: { product: true, inventory: true },
  });
  if (!variant) throw new Error("Product variant is unavailable");
  if ((variant.priceOverrideMinor ?? variant.product.standardPriceMinor) <= 0n) {
    throw new Error("Please contact the store to confirm this product's retail price");
  }
  if (quantity.lt(variant.minQuantity) || !quantity.minus(variant.minQuantity).mod(variant.quantityStep).eq(0)) {
    throw new Error("Invalid quantity increment");
  }
  const available = new Decimal(variant.inventory?.quantityOnHand ?? 0).minus(variant.inventory?.quantityReserved ?? 0);
  if (available.lt(quantity)) throw new Error("Requested quantity is not in stock");
  const cart = await getOrCreateCart(identity);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const nextQuantity = existing ? new Decimal(existing.quantity).plus(quantity) : quantity;
  if (available.lt(nextQuantity)) throw new Error("Requested quantity is not in stock");
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: nextQuantity.toString() },
    create: { cartId: cart.id, productId: variant.productId, variantId, quantity: nextQuantity.toString() },
  });
  return getCart(identity);
}

export async function updateCartItem(identity: CartIdentity, itemId: string, quantityInput: string) {
  const quantity = new Decimal(quantityInput);
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cart: { ...(identity.customerId ? { customerId: identity.customerId } : { guestTokenHash: identity.guestTokenHash }), status: CartStatus.ACTIVE } },
    include: { variant: { include: { inventory: true } } },
  });
  if (!item) throw new Error("Cart item not found");
  if (quantity.lt(item.variant.minQuantity) || !quantity.minus(item.variant.minQuantity).mod(item.variant.quantityStep).eq(0)) {
    throw new Error("Invalid quantity increment");
  }
  const available = new Decimal(item.variant.inventory?.quantityOnHand ?? 0).minus(item.variant.inventory?.quantityReserved ?? 0);
  if (available.lt(quantity)) throw new Error("Requested quantity is not in stock");
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: quantity.toString() } });
  return getCart(identity);
}

export async function removeCartItem(identity: CartIdentity, itemId: string) {
  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { ...(identity.customerId ? { customerId: identity.customerId } : { guestTokenHash: identity.guestTokenHash }), status: CartStatus.ACTIVE } } });
  if (!item) throw new Error("Cart item not found");
  await db.cartItem.delete({ where: { id: item.id } });
  return getCart(identity);
}

export async function mergeGuestCart(customerId: string, guestTokenHash: string) {
  return db.$transaction(async (tx) => {
    const guest = await tx.cart.findFirst({ where: { guestTokenHash, status: CartStatus.ACTIVE }, include: { items: true } });
    if (!guest) return { merged: 0, conflicts: [] as string[] };
    let destination = await tx.cart.findFirst({ where: { customerId, status: CartStatus.ACTIVE } });
    destination ??= await tx.cart.create({ data: { customerId, status: CartStatus.ACTIVE, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000) } });
    const conflicts: string[] = [];
    let merged = 0;
    for (const item of guest.items) {
      const variant = await tx.productVariant.findFirst({ where: { id: item.variantId, active: true, product: { status: PublicationStatus.ACTIVE } }, include: { inventory: true } });
      if (!variant) { conflicts.push(item.variantId); continue; }
      const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: destination.id, variantId: item.variantId } } });
      const quantity = new Decimal(existing?.quantity ?? 0).plus(item.quantity);
      const available = new Decimal(variant.inventory?.quantityOnHand ?? 0).minus(variant.inventory?.quantityReserved ?? 0);
      if (quantity.gt(available)) { conflicts.push(item.variantId); continue; }
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: destination.id, variantId: item.variantId } },
        update: { quantity: quantity.toString() },
        create: { cartId: destination.id, productId: item.productId, variantId: item.variantId, quantity: quantity.toString() },
      });
      merged++;
    }
    await tx.cart.update({ where: { id: guest.id }, data: { status: CartStatus.CONVERTED, guestTokenHash: null } });
    return { merged, conflicts };
  }, { isolationLevel: "Serializable" });
}
