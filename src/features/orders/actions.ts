"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireCustomer } from "@/features/customer/auth/authorization";
import { requireAdmin } from "@/features/admin/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import { db } from "@/lib/db/client";
import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";
import { createOrder, loadManagedOrder, moveOrderStock } from "./service";
import { checkoutSchema, CommerceError, hostedPaymentUrl, isPaymentOpen, type CheckoutMethod } from "./rules";
import { paymentSettingsSchema, enabledPaymentMethods, getPaymentSettings } from "@/features/payments/settings";
import { assertOrderTransition } from "./state-machine";

export type OrderActionState = { error?: string; message?: string; orderId?: string };
function errorState(error: unknown): OrderActionState { return { error: error instanceof CommerceError ? error.message : "Could not save. Check your access and connection, reload and try again." }; }
function refreshOrders() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/inventory");
  for (const locale of ["en", "si", "ta"]) { revalidatePath(`/${locale}`, "layout"); }
}

export async function checkoutAction(_state: OrderActionState, form: FormData): Promise<OrderActionState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Select an available payment method and acknowledge stock confirmation before continuing." };
  try {
    const customer = await requireCustomer();
    await assertPersistentRateLimit("checkout", customer.id, 15, 60 * 60_000);
    const order = await createOrder(customer.id, customer.userId, parsed.data);
    refreshOrders();
    return { orderId: order.id, message: "Request saved. Payment stays blocked until the shop confirms it." };
  } catch (error) { return errorState(error); }
}

const reviewSchema = z.object({ id: z.string().min(1), updatedAt: z.coerce.date(), operation: z.enum(["CONFIRM", "CANCEL", "VERIFY_PAYMENT", "REJECT_REPORT", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED", "PAYMENT_LINK"]), note: z.string().trim().min(3).max(1000), reference: z.string().trim().max(160).default(""), receivedMinor: z.string().regex(/^\d+$/).optional(), paymentUrl: z.string().max(2000).optional(), expiresAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(), verified: z.string().optional() });

export async function manageOrderAction(_state: OrderActionState, form: FormData): Promise<OrderActionState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, value]) => value !== "")));
  if (!parsed.success) return { error: "Complete the review note and required payment details." };
  try {
    const actor = await requireAdmin("orders.manage");
    const input = parsed.data;
    const settings = await getPaymentSettings();
    await db.$transaction(async (tx) => {
      const order = await loadManagedOrder(tx, input.id, input.updatedAt);
      const snapshot = order.pricingSnapshot as Record<string, unknown>;
      const feeOrder = snapshot.kind === "QUOTATION_FEE";
      if (!["GOODS", "QUOTATION_FEE"].includes(String(snapshot.kind))) throw new CommerceError("This legacy order needs a manual accounting review.");
      if (["VERIFY_PAYMENT", "PAYMENT_LINK", "REJECT_REPORT"].includes(input.operation) && snapshot.stockConfirmed !== true) throw new CommerceError("Shop stock confirmation is required before payment handling.");
      let nextStatus = order.status;
      if (input.operation === "CONFIRM") {
        if (order.status !== "DRAFT") throw new CommerceError("Only an unconfirmed order can be confirmed.");
        const choice = snapshot.paymentChoice as CheckoutMethod;
        if (!enabledPaymentMethods(settings).includes(choice)) throw new CommerceError("The selected payment method was disabled. Contact the customer before continuing.");
        await moveOrderStock(tx, order, "reserve", actor.id);
        nextStatus = order.totalMinor === 0n ? "PAID" : "PENDING_PAYMENT";
        await tx.payment.create({ data: { orderId: order.id, method: choice === "CASH" ? "CASH_ON_PICKUP" : choice === "BANK" ? "BANK_TRANSFER" : choice === "PHONE" ? "MANUAL_OTHER" : "ONLINE_PROVIDER", amountMinor: order.totalMinor, status: order.totalMinor === 0n ? "PAID" : "PENDING", verifiedAt: order.totalMinor === 0n ? new Date() : null } });
        if (order.totalMinor === 0n) {
          await moveOrderStock(tx, order, "commit", actor.id);
          if (order.sourceQuotation) await tx.quotation.update({ where: { id: order.sourceQuotation.id }, data: { feePaid: true } });
        }
      } else if (input.operation === "CANCEL") {
        if (!["DRAFT", "PENDING_PAYMENT", "AWAITING_MANUAL_VERIFICATION"].includes(order.status)) throw new CommerceError("Paid orders require a reviewed refund; they cannot be cancelled here.");
        if (order.status === "AWAITING_MANUAL_VERIFICATION") throw new CommerceError("A payment was reported. Resolve it with the customer before cancellation.");
        if (order.status === "PENDING_PAYMENT") await moveOrderStock(tx, order, "release", actor.id);
        await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
        await tx.paymentAttempt.updateMany({ where: { payment: { orderId: order.id }, status: { in: ["CREATED", "PENDING"] } }, data: { status: "CANCELLED" } });
        if (order.sourceQuotation) {
          await tx.quotation.update({ where: { id: order.sourceQuotation.id }, data: { status: "CANCELLED", feeCollectionEnabled: false } });
          await tx.quotationHistory.create({ data: { quotationId: order.sourceQuotation.id, fromStatus: order.sourceQuotation.status, toStatus: "CANCELLED", actorId: actor.id, notes: input.note } });
        }
        if (order.sourcePreOrder) {
          await tx.preOrder.update({ where: { id: order.sourcePreOrder.id }, data: { status: "CANCELLED" } });
          await tx.preOrderHistory.create({ data: { preOrderId: order.sourcePreOrder.id, fromStatus: "CONVERTED_TO_ORDER", toStatus: "CANCELLED", actorId: actor.id, notes: input.note } });
        }
        nextStatus = "CANCELLED";
      } else if (input.operation === "REJECT_REPORT") {
        if (order.status !== "AWAITING_MANUAL_VERIFICATION") throw new CommerceError("There is no pending payment report to resolve.");
        await tx.payment.updateMany({ where: { orderId: order.id, status: "AWAITING_VERIFICATION" }, data: { status: "PENDING" } });
        nextStatus = "PENDING_PAYMENT";
      } else if (input.operation === "VERIFY_PAYMENT") {
        if (!isPaymentOpen(order.status) || input.verified !== "on") throw new CommerceError("Confirm that actual funds were received before verifying payment.");
        const payment = order.payments.find((entry) => ["PENDING", "AWAITING_VERIFICATION"].includes(entry.status));
        if (!payment || input.receivedMinor === undefined || BigInt(input.receivedMinor) !== order.totalMinor || payment.amountMinor !== order.totalMinor) throw new CommerceError("Received amount must match the confirmed order total exactly.");
        if (payment.method !== "CASH_ON_PICKUP" && input.reference.length < 3) throw new CommerceError("Enter the verified bank or provider transaction reference.");
        const provider = payment.method === "BANK_TRANSFER" ? "bank-manual" : payment.method === "MANUAL_OTHER" ? "phone-manual" : payment.method === "ONLINE_PROVIDER" ? "hosted-manual" : "cash";
        await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", verifiedAt: new Date(), provider, providerReference: input.reference ? input.reference.toUpperCase().replace(/\s+/g, "") : `cash:${order.id}` } });
        await moveOrderStock(tx, order, "commit", actor.id);
        if (payment.attempts[0]?.status === "PENDING") await tx.paymentAttempt.update({ where: { id: payment.attempts[0].id }, data: { status: "SUCCEEDED" } });
        if (order.sourceQuotation) {
          await tx.quotation.update({ where: { id: order.sourceQuotation.id }, data: { feePaid: true } });
          await tx.quotationHistory.create({ data: { quotationId: order.sourceQuotation.id, fromStatus: "ACCEPTED", toStatus: "ACCEPTED", actorId: actor.id, notes: "Quotation service fee receipt verified by the shop." } });
        }
        nextStatus = "PAID";
      } else if (input.operation === "PAYMENT_LINK") {
        if (!isPaymentOpen(order.status) || !settings.hostedEnabled) throw new CommerceError("Confirm stock and enable hosted payments before publishing a link.");
        const payment = order.payments.find((entry) => entry.method === "ONLINE_PROVIDER" && ["PENDING", "AWAITING_VERIFICATION"].includes(entry.status));
        if (!payment) throw new CommerceError("The customer did not choose hosted payment.");
        const confirmedSettings = paymentSettingsSchema.parse(snapshot.paymentDetails);
        const url = hostedPaymentUrl(input.paymentUrl ?? "", confirmedSettings.hostedHost);
        if (!input.expiresAt || input.expiresAt <= new Date()) throw new CommerceError("Enter the provider link's future expiry time.");
        await tx.paymentAttempt.updateMany({ where: { paymentId: payment.id, status: { in: ["PENDING", "CREATED"] } }, data: { status: "CANCELLED" } });
        await tx.paymentAttempt.create({ data: { paymentId: payment.id, idempotencyKey: crypto.randomUUID(), status: "PENDING", requestMetadata: { amountMinor: order.totalMinor.toString(), currency: order.currency, orderNumber: order.orderNumber }, responseMetadata: { url, expiresAt: input.expiresAt.toISOString(), provider: settings.hostedName } } });
      } else {
        if (feeOrder && input.operation !== "COMPLETED" && input.operation !== "PROCESSING") throw new CommerceError("A quotation fee does not have a pickup stage.");
        if (feeOrder && input.operation === "COMPLETED" && order.status === "PAID") nextStatus = "COMPLETED";
        else { assertOrderTransition(order.status, input.operation); nextStatus = input.operation; }
      }
      const updated = await tx.order.updateMany({ where: { id: order.id, updatedAt: input.updatedAt }, data: { status: nextStatus, ...(input.operation === "CONFIRM" ? { pricingSnapshot: { ...snapshot, stockConfirmed: true, paymentDetails: settings } as Prisma.InputJsonObject } : {}), ...(nextStatus === "PAID" ? { inventoryCommittedAt: new Date() } : {}), ...(nextStatus === "CANCELLED" ? { cancelledAt: new Date() } : {}), ...(nextStatus === "COMPLETED" ? { completedAt: new Date() } : {}) } });
      if (updated.count !== 1) throw new CommerceError("This order changed. Reload and review it again.");
      if (nextStatus !== order.status) await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: nextStatus, actorId: actor.id, reason: input.note } });
      await tx.orderNote.create({ data: { orderId: order.id, authorId: actor.id, body: input.note, internal: false } });
      await writeAudit(tx, actor, { action: `ORDER_${input.operation}`, entityType: "Order", entityId: order.id, after: { status: nextStatus, totalMinor: order.totalMinor.toString() } });
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    refreshOrders();
    return { message: "Order updated." };
  } catch (error) { return errorState(error); }
}

export async function reportPaymentAction(_state: OrderActionState, form: FormData): Promise<OrderActionState> {
  const parsed = z.object({ orderId: z.string().min(1), updatedAt: z.coerce.date(), reference: z.string().trim().min(3).max(160), accepted: z.literal("on") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter the transfer reference and confirm that you submitted the payment." };
  try {
    const customer = await requireCustomer();
    await assertPersistentRateLimit("payment-report", customer.id, 10, 60 * 60_000);
    await db.$transaction(async (tx) => {
      const order = await loadManagedOrder(tx, parsed.data.orderId, parsed.data.updatedAt);
      if (order.customerId !== customer.id) throw new CommerceError("Order not found.");
      if ((order.pricingSnapshot as Record<string, unknown>).stockConfirmed !== true || !isPaymentOpen(order.status)) throw new CommerceError("Payment reporting is unavailable before shop confirmation or after payment.");
      const payment = order.payments.find((entry) => ["PENDING", "AWAITING_VERIFICATION"].includes(entry.status));
      if (!payment || payment.method === "CASH_ON_PICKUP") throw new CommerceError("Cash is confirmed by the shop when collected.");
      await tx.payment.update({ where: { id: payment.id }, data: { status: "AWAITING_VERIFICATION" } });
      await tx.order.update({ where: { id: order.id }, data: { status: "AWAITING_MANUAL_VERIFICATION" } });
      await tx.orderNote.create({ data: { orderId: order.id, authorId: customer.userId, internal: false, body: `Customer-reported payment reference (not verified): ${parsed.data.reference}` } });
      if (order.status !== "AWAITING_MANUAL_VERIFICATION") await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: "AWAITING_MANUAL_VERIFICATION", actorId: customer.userId, reason: "Customer reported payment; shop must verify actual receipt." } });
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    refreshOrders();
    return { message: "Reference submitted. Payment remains unverified until the shop checks receipt." };
  } catch (error) { return errorState(error); }
}
