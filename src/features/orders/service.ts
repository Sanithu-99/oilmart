import "server-only";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { calculatePrice } from "@/features/pricing/service";
import { resolvePromotionUnitPrice } from "@/features/pricing/promotions";
import { enabledPaymentMethods, getPaymentSettings } from "@/features/payments/settings";
import { writeAudit } from "@/features/admin/audit";
import type { Prisma } from "@/generated/prisma/client";
import { assertCurrentVersion, assertQuantity, CommerceError, stockMovement, purchaseFingerprint, type checkoutSchema } from "./rules";
import type { z } from "zod";

const orderInclude = { items: true, payments: { include: { attempts: { orderBy: { createdAt: "desc" as const }, take: 1 } } }, sourceQuotation: true, sourcePreOrder: true } satisfies Prisma.OrderInclude;
export type ManagedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
export { orderInclude };

export async function createOrder(customerId: string, userId: string, input: z.infer<typeof checkoutSchema>) {
  const settings = await getPaymentSettings();
  if (!enabledPaymentMethods(settings).includes(input.method)) throw new CommerceError("This payment method is unavailable. Choose another method.");
  return db.$transaction(async (tx) => {
    const customer = await tx.customerProfile.findUniqueOrThrow({ where: { id: customerId }, include: { user: true, loyaltyMembership: true } });
    if (!customer.user.emailVerified || !customer.user.phone) throw new CommerceError("Verify your email and add a mobile number in your account before ordering.");
    const source = input.source === "cart"
      ? await tx.cart.findFirst({ where: { id: input.sourceId, customerId }, include: { items: true } })
      : input.source === "preorder"
        ? await tx.preOrder.findFirst({ where: { id: input.sourceId, customerId } })
        : await tx.quotation.findFirst({ where: { id: input.sourceId, customerId } });
    if (!source) throw new CommerceError("Request not found.");
    const existing = input.source === "cart" ? await tx.order.findUnique({ where: { cartId: source.id } }) : "orderId" in source && source.orderId ? await tx.order.findUnique({ where: { id: source.orderId } }) : null;
    if (existing) {
      if (existing.customerId !== customerId) throw new CommerceError("Request not found.");
      return existing;
    }
    if (input.source !== "cart" && (!input.sourceVersion || source.updatedAt.toISOString() !== input.sourceVersion)) throw new CommerceError("This request changed. Reload and review the current terms before accepting.");
    const now = new Date();
    if ("expiresAt" in source && source.expiresAt && source.expiresAt <= now) throw new CommerceError("This request has expired.");
    if (input.source === "cart" && source.status !== "ACTIVE") throw new CommerceError("This cart is no longer active.");
    if (input.source === "preorder" && source.status !== "APPROVED") throw new CommerceError("Shop approval is required before continuing with a pre-order.");
    if ("validUntil" in source && source.validUntil && source.validUntil <= now) throw new CommerceError("This quotation has expired.");
    if (input.source === "quotation" && !["PREPARED", "SENT"].includes(source.status)) throw new CommerceError("The owner must prepare your quotation fee first.");
    const fee = "feeMinor" in source ? source.feeMinor : null;
    const requested = "items" in source ? source.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity.toString() })) : "variantId" in source ? [{ variantId: source.variantId, quantity: source.quantity.toString() }] : [];
    if (fee === null && !requested.length) throw new CommerceError("Your cart is empty.");
    const variants = await tx.productVariant.findMany({ where: { id: { in: requested.map((item) => item.variantId) }, active: true, product: { status: "ACTIVE" } }, include: { product: true } });
    const membership = customer.loyaltyMembership;
    const loyaltyEligible = Boolean(membership?.status === "ACTIVE" && (!membership.expiresAt || membership.expiresAt > now));
    const promotions = await tx.promotion.findMany({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, include: { products: true, categories: true } });
    const pricedInput = requested.map((item) => {
      const variant = variants.find((entry) => entry.id === item.variantId);
      if (!variant) throw new CommerceError("A selected product or size is unavailable.");
      assertQuantity(item.quantity, variant.minQuantity.toString(), variant.quantityStep.toString());
      const standardUnitPriceMinor = variant.priceOverrideMinor ?? variant.product.standardPriceMinor;
      if (standardUnitPriceMinor <= 0n) throw new CommerceError("Ask the shop to confirm the price before ordering.");
      const loyaltyUnitPriceMinor = variant.loyaltyPriceMinor ?? variant.product.loyaltyPriceMinor;
      const base = loyaltyEligible && loyaltyUnitPriceMinor != null ? loyaltyUnitPriceMinor : standardUnitPriceMinor;
      const promotion = resolvePromotionUnitPrice({ productId: variant.productId, categoryId: variant.product.categoryId, baseUnitPriceMinor: base, loyaltyEligible, promotions: promotions.map((entry) => ({ ...entry, productIds: entry.products.map((p) => p.productId), categoryIds: entry.categories.map((c) => c.categoryId) })) });
      return { productId: variant.productId, quantity: item.quantity, standardUnitPriceMinor, loyaltyUnitPriceMinor, promotionUnitPriceMinor: promotion?.unitPriceMinor };
    });
    // Actual hosted payments never use the unapproved card-surcharge estimate.
    const pricing = calculatePrice(pricedInput, { loyaltyEligible });
    if (input.source === "cart" && (!input.fingerprint || input.fingerprint !== purchaseFingerprint(requested.map((item, index) => ({ ...item, unitPriceMinor: pricing.lines[index]!.unitPriceMinor.toString() }))))) throw new CommerceError("Your cart changed. Reload and review the selected items before continuing.");
    const total = fee ?? pricing.totalMinor;
    if (total !== BigInt(input.expectedTotal)) throw new CommerceError("The price changed. Reload and review the current total before continuing.");
    const order = await tx.order.create({ data: {
      orderNumber: `SOM-${randomUUID()}`, customerId, cartId: input.source === "cart" ? source.id : null,
      status: "DRAFT", fulfillmentMethod: "PICKUP", locale: input.locale.toUpperCase() as "EN" | "SI" | "TA", customerName: customer.user.name ?? customer.firstName ?? "Customer", customerPhone: customer.user.phone, customerEmail: customer.user.email,
      subtotalMinor: fee ?? pricing.subtotalMinor, discountMinor: fee !== null ? 0n : pricing.discountMinor, totalMinor: total,
      pricingSnapshot: { kind: fee !== null ? "QUOTATION_FEE" : "GOODS", source: input.source, sourceId: source.id, paymentChoice: input.method, loyaltyEligible, stockConfirmed: false, feeAcceptedMinor: fee?.toString() ?? null, feeTerms: "terms" in source ? source.terms : null }, placedAt: now,
      items: { create: requested.map((item, index) => { const variant = variants.find((entry) => entry.id === item.variantId)!; return { productId: variant.productId, variantId: variant.id, sku: variant.sku, productName: variant.product.name, variantName: variant.name, quantity: item.quantity, unitPriceMinor: pricing.lines[index]!.unitPriceMinor, discountMinor: pricing.lines[index]!.lineDiscountMinor, lineTotalMinor: pricing.lines[index]!.lineTotalMinor }; }) },
      statusHistory: { create: { toStatus: "DRAFT", actorId: userId, reason: fee !== null ? "Customer accepted the owner-set quotation fee. Awaiting shop confirmation." : "Awaiting physical stock confirmation. No payment requested." } },
    } });
    if (input.source === "cart") await tx.cart.update({ where: { id: source.id }, data: { status: "CONVERTED" } });
    if (input.source === "preorder") {
      await tx.preOrder.update({ where: { id: source.id }, data: { status: "CONVERTED_TO_ORDER", orderId: order.id } });
      await tx.preOrderHistory.create({ data: { preOrderId: source.id, fromStatus: "APPROVED", toStatus: "CONVERTED_TO_ORDER", actorId: userId, notes: `Customer continued to ${order.orderNumber}; stock confirmation is still required.` } });
    }
    if (input.source === "quotation") {
      await tx.quotation.update({ where: { id: source.id }, data: { status: "ACCEPTED", acceptedAt: now, orderId: order.id, feeCollectionEnabled: true } });
      await tx.quotationHistory.create({ data: { quotationId: source.id, fromStatus: source.status as "PREPARED" | "SENT", toStatus: "ACCEPTED", actorId: userId, notes: `Customer accepted quotation service fee ${total} minor units. No funds collected.` } });
    }
    await writeAudit(tx, { id: userId }, { action: "ORDER_REQUESTED", entityType: "Order", entityId: order.id, after: { totalMinor: total.toString(), source: input.source } });
    return order;
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
}

export async function moveOrderStock(tx: Prisma.TransactionClient, order: ManagedOrder, operation: "reserve" | "release" | "commit", actorId: string) {
  for (const item of order.items) {
    const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId }, include: { variant: { include: { product: true } } } });
    if (!inventory || operation === "reserve" && (!inventory.variant.active || inventory.variant.product.status !== "ACTIVE")) throw new CommerceError("A selected size is no longer available.");
    const next = stockMovement(inventory.quantityOnHand.toString(), inventory.quantityReserved.toString(), item.quantity.toString(), operation);
    const changed = await tx.inventory.updateMany({ where: { id: inventory.id, version: inventory.version }, data: { quantityOnHand: next.onHand, quantityReserved: next.reserved, version: { increment: 1 } } });
    if (changed.count !== 1) throw new CommerceError("Stock changed while saving. Reload and try again.");
    if (operation === "commit") await tx.inventoryAdjustment.create({ data: { inventoryId: inventory.id, type: "SALE", quantityDelta: new Decimal(item.quantity.toString()).negated().toString(), quantityBefore: inventory.quantityOnHand.toString(), quantityAfter: next.onHand, reason: "Verified order payment", referenceType: "Order", referenceId: order.id, idempotencyKey: `order-sale:${order.id}:${item.id}`, actorId } });
  }
}

export async function loadManagedOrder(tx: Prisma.TransactionClient, id: string, expected: Date) {
  const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new CommerceError("Order not found.");
  assertCurrentVersion(order.updatedAt, expected);
  return order;
}
