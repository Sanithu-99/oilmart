import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  config: vi.fn(), customer: vi.fn(), settings: vi.fn(), order: vi.fn(), audit: vi.fn(), rate: vi.fn(), transaction: vi.fn(),
  tx: { paymentAttempt: { create: vi.fn() }, payment: { update: vi.fn() } },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: m.transaction } }));
vi.mock("@/features/customer/auth/authorization", () => ({ requireCustomer: m.customer }));
vi.mock("@/features/admin/audit", () => ({ writeAudit: m.audit }));
vi.mock("@/lib/security/admin-rate-limit", () => ({ assertPersistentRateLimit: m.rate }));
vi.mock("@/features/orders/service", () => ({ loadManagedOrder: m.order }));
vi.mock("@/features/payments/settings", async original => ({ ...await original<typeof import("@/features/payments/settings")>(), getPaymentSettings: m.settings }));
vi.mock("@/features/payments/payhere-config", async original => ({ ...await original<typeof import("@/features/payments/payhere-config")>(), getPayHereConfig: m.config }));
import { preparePayHereAction } from "@/features/payments/payhere-actions";

const config = { merchantId: "123456", merchantSecret: "not-real-test-secret", mode: "sandbox" as const, appUrl: "https://shop.example" };
const settings = { hostedEnabled: true, hostedName: "PayHere", hostedHost: "sandbox.payhere.lk" };
const revision = "2026-11-26T18:00:00.000Z";
function form(extra: Record<string, string> = {}) {
  const f = new FormData(); for (const [key, value] of Object.entries({ orderId: "o1", updatedAt: revision, locale: "en", firstName: "First", lastName: "Last", address: "123 Real Street", city: "Colombo", accepted: "on", ...extra })) f.set(key, value); return f;
}
function order(extra: Record<string, unknown> = {}) {
  return { id: "o1", orderNumber: "SOM-1", customerId: "c1", customerEmail: "customer@example.com", customerPhone: "+94771234567", updatedAt: new Date(revision), status: "PENDING_PAYMENT", currency: "LKR", totalMinor: 125050n, pricingSnapshot: { stockConfirmed: true, paymentDetails: settings }, payments: [{ id: "pay1", status: "PENDING", method: "ONLINE_PROVIDER", amountMinor: 125050n, attempts: [] }], ...extra };
}
beforeEach(() => { vi.resetAllMocks(); m.config.mockReturnValue(config); m.customer.mockResolvedValue({ id: "c1", userId: "u1" }); m.settings.mockResolvedValue(settings); m.order.mockResolvedValue(order()); m.tx.paymentAttempt.create.mockImplementation(({ data }) => data); m.transaction.mockImplementation(work => work(m.tx)); });
describe("authenticated PayHere checkout preparation", () => {
  it("requires billing details and explicit sharing acknowledgement", async () => { expect((await preparePayHereAction({}, form({ accepted: "" }))).error).toBeTruthy(); expect(m.customer).not.toHaveBeenCalled(); });
  it("fails closed when merchant credentials or owner enablement is missing", async () => { m.config.mockReturnValue(null); expect((await preparePayHereAction({}, form())).error).toMatch(/unavailable/); expect(m.transaction).not.toHaveBeenCalled(); });
  it("rejects another customer's order and unconfirmed stock", async () => {
    m.order.mockResolvedValue(order({ customerId: "other" })); expect((await preparePayHereAction({}, form())).error).toMatch(/not found/);
    m.order.mockResolvedValue(order({ pricingSnapshot: { stockConfirmed: false } })); expect((await preparePayHereAction({}, form())).error).toMatch(/Stock confirmation/); expect(m.tx.paymentAttempt.create).not.toHaveBeenCalled();
  });
  it("returns the exact trusted total and documented sandbox endpoint without exposing the secret", async () => {
    const result = await preparePayHereAction({}, form({ amount: "1.00" })); expect(result.checkout?.endpoint).toBe("https://sandbox.payhere.lk/pay/checkout"); expect(result.checkout?.fields.amount).toBe("1250.50"); expect(result.checkout?.fields.notify_url).toBe("https://shop.example/api/payments/payhere/notify"); expect(result.checkout?.fields.address).toBe("123 Real Street"); expect(JSON.stringify(result)).not.toContain(config.merchantSecret); expect(result.checkout?.sandbox).toBe(true);
  });
  it("reuses a matching pending attempt instead of creating a second charge request", async () => {
    const attempt = { id: "03125176-dac3-4a9c-a0eb-86fba0b65d07", status: "PENDING", requestMetadata: { provider: "payhere", merchantId: config.merchantId, mode: "sandbox", amountMinor: "125050" } };
    const existing = order(); existing.payments[0].attempts = [attempt] as never; m.order.mockResolvedValue(existing);
    const result = await preparePayHereAction({}, form()); expect(result.checkout?.fields.order_id).toBe(attempt.id); expect(m.tx.paymentAttempt.create).not.toHaveBeenCalled();
  });
  it("does not replace an owner-issued link or a pending request from a different merchant", async () => {
    const existing = order(); existing.payments[0].attempts = [{ id: "existing", status: "PENDING", requestMetadata: {} }] as never; m.order.mockResolvedValue(existing);
    expect((await preparePayHereAction({}, form())).error).toMatch(/existing payment/); expect(m.tx.paymentAttempt.create).not.toHaveBeenCalled();
  });
});
