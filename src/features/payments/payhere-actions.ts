"use server";
import { randomUUID } from "node:crypto";
import { requireCustomer } from "@/features/customer/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import { loadManagedOrder } from "@/features/orders/service";
import { CommerceError, isPaymentOpen } from "@/features/orders/rules";
import { db } from "@/lib/db/client";
import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";
import { billingSchema, payHereAmount, payHereCheckoutHash, payHereHost } from "./payhere";
import { getPayHereConfig, payHereEnabled } from "./payhere-config";
import { getPaymentSettings, paymentSettingsSchema } from "./settings";

export type GatewayActionState = { error?: string; checkout?: { endpoint: string; fields: Record<string, string>; sandbox: boolean } };
export async function preparePayHereAction(_state: GatewayActionState, form: FormData): Promise<GatewayActionState> {
  const input = billingSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Enter your billing name, address and city, and acknowledge the confirmed payment." };
  try {
    const customer = await requireCustomer();
    await assertPersistentRateLimit("payhere-start", customer.id, 10, 60 * 60_000);
    const config = getPayHereConfig();
    const current = await getPaymentSettings();
    if (!config || !payHereEnabled(current, config)) throw new CommerceError("Online payment is unavailable. Contact the shop.");
    const fields = await db.$transaction(async (tx) => {
      const order = await loadManagedOrder(tx, input.data.orderId, new Date(input.data.updatedAt));
      if (order.customerId !== customer.id) throw new CommerceError("Order not found.");
      const snapshot = order.pricingSnapshot as Record<string, unknown>;
      if (snapshot.stockConfirmed !== true || !isPaymentOpen(order.status) || order.currency !== "LKR") throw new CommerceError("Stock confirmation and an unpaid LKR order are required.");
      const settings = paymentSettingsSchema.parse(snapshot.paymentDetails);
      if (!payHereEnabled(settings, config)) throw new CommerceError("This order was confirmed for another payment provider.");
      const payment = order.payments.find(p => p.method === "ONLINE_PROVIDER" && ["PENDING", "AWAITING_VERIFICATION"].includes(p.status));
      if (!payment || payment.amountMinor !== order.totalMinor || !order.customerEmail || !order.customerPhone) throw new CommerceError("The confirmed payment or contact details are unavailable.");
      const amount = payHereAmount(order.totalMinor);
      let attempt = payment.attempts[0];
      if (attempt?.status === "PENDING") {
        const metadata = attempt.requestMetadata as Record<string, unknown> | null;
        if (metadata?.provider !== "payhere" || metadata?.merchantId !== config.merchantId || metadata?.mode !== config.mode || metadata?.amountMinor !== order.totalMinor.toString()) throw new CommerceError("An existing payment is in progress. Contact the shop before starting another.");
      } else {
        const attemptId = randomUUID();
        attempt = await tx.paymentAttempt.create({ data: { id: attemptId, paymentId: payment.id, idempotencyKey: `payhere:${attemptId}`, status: "PENDING", requestMetadata: { provider: "payhere", merchantId: config.merchantId, mode: config.mode, amountMinor: order.totalMinor.toString(), currency: order.currency } } });
        await tx.payment.update({ where: { id: payment.id }, data: { provider: "payhere" } });
        await writeAudit(tx, { id: customer.userId }, { action: "PAYHERE_CHECKOUT_PREPARED", entityType: "Order", entityId: order.id, after: { attemptId, mode: config.mode, amountMinor: order.totalMinor.toString() } });
      }
      const returnUrl = new URL(`/${input.data.locale}/account/orders/${order.id}`, config.appUrl).toString();
      return { merchant_id: config.merchantId, return_url: returnUrl, cancel_url: returnUrl, notify_url: new URL("/api/payments/payhere/notify", config.appUrl).toString(), first_name: input.data.firstName, last_name: input.data.lastName, email: order.customerEmail, phone: order.customerPhone, address: input.data.address, city: input.data.city, country: "Sri Lanka", order_id: attempt.id, items: order.orderNumber, currency: "LKR", amount, hash: payHereCheckoutHash(config, attempt.id, amount, "LKR") };
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    return { checkout: { endpoint: `https://${payHereHost(config)}/pay/checkout`, fields, sandbox: config.mode === "sandbox" } };
  } catch (error) { return { error: error instanceof CommerceError ? error.message : "Could not prepare payment. Reload your order and try again." }; }
}
