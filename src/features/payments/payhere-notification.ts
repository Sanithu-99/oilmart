import "server-only";
import { db } from "@/lib/db/client";
import { orderInclude, moveOrderStock } from "@/features/orders/service";
import { CommerceError, isPaymentOpen } from "@/features/orders/rules";
import { getPayHereConfig } from "./payhere-config";
import { payHereAmount, payHereNotificationSchema, verifyPayHereNotification } from "./payhere";

/** Browser returns never call this function. Only a verified provider notification can settle funds. */
export async function processPayHereNotification(fields: Record<string, string>) {
  const config = getPayHereConfig();
  if (!config) return { status: 503, message: "Payment provider is unavailable." };
  const parsed = payHereNotificationSchema.safeParse(fields);
  if (!parsed.success || !verifyPayHereNotification(config, parsed.data)) return { status: 400, message: "Invalid payment notification." };
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: input.order_id }, include: { payment: true } });
    if (!attempt) return { status: 404, message: "Payment request not found." };
    const metadata = attempt.requestMetadata as Record<string, unknown> | null;
    const payment = attempt.payment;
    const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: orderInclude });
    if (!order || metadata?.provider !== "payhere" || metadata.merchantId !== config.merchantId || metadata.mode !== config.mode || metadata.currency !== input.payhere_currency || metadata.amountMinor !== order.totalMinor.toString() || input.payhere_amount !== payHereAmount(order.totalMinor) || payment.amountMinor !== order.totalMinor || payment.currency !== input.payhere_currency || payment.method !== "ONLINE_PROVIDER") return { status: 400, message: "Payment does not match the confirmed request." };
    // A duplicate callback must never commit stock again or replace a settled reference.
    if (payment.status === "PAID") {
      if (input.status_code === "2" && payment.provider === "payhere" && payment.providerReference === input.payment_id && attempt.status === "SUCCEEDED") return { status: 200, message: "Payment already recorded." };
      await tx.auditLog.create({ data: { action: "PAYHERE_SETTLED_NOTIFICATION_REVIEW", entityType: "Order", entityId: order.id, metadata: { paymentId: input.payment_id, statusCode: input.status_code } } });
      return { status: 200, message: "Notification received for shop review." };
    }
    const snapshot = order.pricingSnapshot as Record<string, unknown>;
    if (snapshot.stockConfirmed !== true || !isPaymentOpen(order.status) || !["PENDING", "AWAITING_VERIFICATION"].includes(payment.status) || attempt.status === "CANCELLED") {
      await tx.auditLog.create({ data: { action: "PAYHERE_CLOSED_ORDER_NOTIFICATION_REVIEW", entityType: "Order", entityId: order.id, metadata: { paymentId: input.payment_id, statusCode: input.status_code, attemptId: attempt.id } } });
      return { status: 200, message: "Notification received for shop reconciliation." };
    }
    if (input.status_code !== "2") {
      if (input.status_code !== "0") await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", failureCode: input.status_code, failureMessage: "Provider did not report a successful payment." } });
      return { status: 200, message: "Payment status recorded; no funds confirmed." };
    }
    const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: { in: ["PENDING", "AWAITING_VERIFICATION"] } }, data: { status: "PAID", provider: "payhere", providerReference: input.payment_id, verifiedAt: new Date() } });
    if (claimed.count !== 1) throw new CommerceError("Payment changed during verification.");
    await moveOrderStock(tx, order, "commit", null);
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "SUCCEEDED", providerAttemptId: input.payment_id, responseMetadata: { provider: "payhere", paymentId: input.payment_id, statusCode: input.status_code }, failureCode: null, failureMessage: null } });
    const changed = await tx.order.updateMany({ where: { id: order.id, updatedAt: order.updatedAt, status: order.status }, data: { status: "PAID", inventoryCommittedAt: new Date() } });
    if (changed.count !== 1) throw new CommerceError("Order changed during verification.");
    if (order.sourceQuotation) {
      await tx.quotation.update({ where: { id: order.sourceQuotation.id }, data: { feePaid: true } });
      await tx.quotationHistory.create({ data: { quotationId: order.sourceQuotation.id, fromStatus: "ACCEPTED", toStatus: "ACCEPTED", notes: "Quotation service fee verified by PayHere notification." } });
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: "PAID", reason: "Payment verified through the signed PayHere server notification." } });
    await tx.auditLog.create({ data: { action: "PAYHERE_PAYMENT_VERIFIED", entityType: "Order", entityId: order.id, after: { amountMinor: order.totalMinor.toString(), paymentId: input.payment_id, attemptId: attempt.id } } });
    return { status: 200, message: "Payment verified." };
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
}
