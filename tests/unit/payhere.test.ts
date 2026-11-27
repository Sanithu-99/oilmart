import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { payHereAmount, payHereCheckoutHash, payHereNotificationSchema, verifyPayHereNotification, type PayHereNotification } from "@/features/payments/payhere";

const m = vi.hoisted(() => ({
  config: vi.fn(), stock: vi.fn(), transaction: vi.fn(),
  tx: { paymentAttempt: { findUnique: vi.fn(), update: vi.fn() }, order: { findUnique: vi.fn(), updateMany: vi.fn() }, payment: { updateMany: vi.fn() }, quotation: { update: vi.fn() }, quotationHistory: { create: vi.fn() }, orderStatusHistory: { create: vi.fn() }, auditLog: { create: vi.fn() } },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: m.transaction } }));
vi.mock("@/features/payments/payhere-config", () => ({ getPayHereConfig: m.config }));
vi.mock("@/features/orders/service", () => ({ orderInclude: {}, moveOrderStock: m.stock }));
import { processPayHereNotification } from "@/features/payments/payhere-notification";

const config = { merchantId: "123456", merchantSecret: "not-real-test-secret", mode: "sandbox" as const, appUrl: "https://shop.example" };
const attemptId = "03125176-dac3-4a9c-a0eb-86fba0b65d07";
const digest = (text: string) => createHash("md5").update(text).digest("hex").toUpperCase();
function notification(extra: Partial<PayHereNotification> = {}): PayHereNotification {
  const fields = { merchant_id: config.merchantId, order_id: attemptId, payment_id: "32000001", payhere_amount: "1250.50", payhere_currency: "LKR" as const, status_code: "2" as const, md5sig: "", ...extra };
  fields.md5sig = digest(fields.merchant_id + fields.order_id + fields.payhere_amount + fields.payhere_currency + fields.status_code + digest(config.merchantSecret));
  return fields;
}
function fixtures() {
  const payment = { id: "pay1", orderId: "o1", method: "ONLINE_PROVIDER", status: "PENDING", provider: "payhere", amountMinor: 125050n, currency: "LKR", providerReference: null as string | null };
  const attempt = { id: attemptId, status: "PENDING", payment, requestMetadata: { provider: "payhere", merchantId: config.merchantId, mode: "sandbox", amountMinor: "125050", currency: "LKR" } };
  const order = { id: "o1", status: "PENDING_PAYMENT", updatedAt: new Date(), totalMinor: 125050n, pricingSnapshot: { stockConfirmed: true }, items: [], sourceQuotation: null };
  return { payment, attempt, order };
}
beforeEach(() => {
  vi.resetAllMocks(); m.config.mockReturnValue(config); m.transaction.mockImplementation(work => work(m.tx));
  const f = fixtures(); m.tx.paymentAttempt.findUnique.mockResolvedValue(f.attempt); m.tx.order.findUnique.mockResolvedValue(f.order);
  m.tx.payment.updateMany.mockResolvedValue({ count: 1 }); m.tx.order.updateMany.mockResolvedValue({ count: 1 });
});
describe("PayHere documented signature and amount format", () => {
  it("formats amounts without floating point precision loss", () => { expect(payHereAmount(900719925474099301n)).toBe("9007199254740993.01"); expect(() => payHereAmount(0n)).toThrow(); });
  it("generates the documented checkout hash server-side", () => { expect(payHereCheckoutHash(config, attemptId, "1250.50", "LKR")).toBe(digest(config.merchantId + attemptId + "1250.50LKR" + digest(config.merchantSecret))); });
  it("rejects malformed notification fields", () => { expect(payHereNotificationSchema.safeParse({ ...notification(), payhere_amount: "1e3" }).success).toBe(false); expect(payHereNotificationSchema.safeParse({ ...notification(), status_code: "3" }).success).toBe(false); });
  it("accepts genuine signatures and rejects amount, merchant or signature tampering", () => { const n = notification(); expect(verifyPayHereNotification(config, n)).toBe(true); expect(verifyPayHereNotification(config, { ...n, payhere_amount: "1.00" })).toBe(false); expect(verifyPayHereNotification(config, notification({ merchant_id: "999999" }))).toBe(false); });
});
describe("verified payment persistence", () => {
  it("fails closed without merchant credentials", async () => { m.config.mockReturnValue(null); expect((await processPayHereNotification(notification())).status).toBe(503); expect(m.transaction).not.toHaveBeenCalled(); });
  it("rejects bad signatures before touching persistence", async () => { expect((await processPayHereNotification({ ...notification(), md5sig: "0".repeat(32) })).status).toBe(400); expect(m.transaction).not.toHaveBeenCalled(); });
  it("requires an existing, matching amount and provider attempt", async () => {
    expect((await processPayHereNotification(notification({ payhere_amount: "1.00" }))).status).toBe(400); expect(m.stock).not.toHaveBeenCalled();
    m.tx.paymentAttempt.findUnique.mockResolvedValue(null); expect((await processPayHereNotification(notification())).status).toBe(404);
  });
  it("commits stock exactly once after a matching signed success", async () => {
    expect((await processPayHereNotification(notification())).status).toBe(200);
    expect(m.tx.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PAID", providerReference: "32000001" }) }));
    expect(m.stock).toHaveBeenCalledOnce(); expect(m.tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) }));
  });
  it("acknowledges duplicate success without deducting stock again", async () => {
    const f = fixtures(); f.payment.status = "PAID"; f.payment.providerReference = "32000001"; f.attempt.status = "SUCCEEDED";
    m.tx.paymentAttempt.findUnique.mockResolvedValue(f.attempt); expect((await processPayHereNotification(notification())).status).toBe(200); expect(m.stock).not.toHaveBeenCalled(); expect(m.tx.payment.updateMany).not.toHaveBeenCalled();
  });
  it("records pending or failed results without collecting money or releasing stock", async () => {
    await processPayHereNotification(notification({ status_code: "0" })); expect(m.stock).not.toHaveBeenCalled(); expect(m.tx.payment.updateMany).not.toHaveBeenCalled();
    await processPayHereNotification(notification({ status_code: "-2" })); expect(m.tx.paymentAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }));
  });
  it("routes a late success for a cancelled or unconfirmed order to reconciliation", async () => {
    const f = fixtures(); f.order.status = "CANCELLED"; m.tx.order.findUnique.mockResolvedValue(f.order);
    expect((await processPayHereNotification(notification())).status).toBe(200); expect(m.stock).not.toHaveBeenCalled(); expect(m.tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "PAYHERE_CLOSED_ORDER_NOTIFICATION_REVIEW" }) }));
  });
  it("does not downgrade a paid order after a later failure or refund notice", async () => {
    const f = fixtures(); f.payment.status = "PAID"; m.tx.paymentAttempt.findUnique.mockResolvedValue(f.attempt);
    await processPayHereNotification(notification({ status_code: "-3" })); expect(m.stock).not.toHaveBeenCalled(); expect(m.tx.payment.updateMany).not.toHaveBeenCalled(); expect(m.tx.auditLog.create).toHaveBeenCalled();
  });
  it("updates a quotation fee after authenticated receipt", async () => {
    m.tx.order.findUnique.mockResolvedValue({ ...fixtures().order, sourceQuotation: { id: "quote1" } }); await processPayHereNotification(notification());
    expect(m.tx.quotation.update).toHaveBeenCalledWith({ where: { id: "quote1" }, data: { feePaid: true } });
  });
  it("refuses a racing payment update before touching inventory", async () => { m.tx.payment.updateMany.mockResolvedValue({ count: 0 }); await expect(processPayHereNotification(notification())).rejects.toThrow("changed"); expect(m.stock).not.toHaveBeenCalled(); });
});
