import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommerceError, stockMovement, purchaseFingerprint } from "@/features/orders/rules";

const m = vi.hoisted(() => {
  const tx = {
    customerProfile: { findUniqueOrThrow: vi.fn() }, cart: { findFirst: vi.fn(), update: vi.fn() }, preOrder: { findFirst: vi.fn(), update: vi.fn() }, preOrderHistory: { create: vi.fn() },
    quotation: { findFirst: vi.fn(), update: vi.fn() }, quotationHistory: { create: vi.fn() }, productVariant: { findMany: vi.fn() }, promotion: { findMany: vi.fn() },
    order: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), update: vi.fn() }, orderStatusHistory: { create: vi.fn() }, orderNote: { create: vi.fn() },
    inventory: { findUnique: vi.fn(), updateMany: vi.fn() }, inventoryAdjustment: { create: vi.fn() }, payment: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, paymentAttempt: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  };
  return { tx, transaction: vi.fn(), customer: vi.fn(), admin: vi.fn(), settings: vi.fn(), audit: vi.fn(), rate: vi.fn() };
});
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: m.transaction } }));
vi.mock("@/features/customer/auth/authorization", () => ({ requireCustomer: m.customer }));
vi.mock("@/features/admin/auth/authorization", () => ({ requireAdmin: m.admin }));
vi.mock("@/features/admin/audit", () => ({ writeAudit: m.audit }));
vi.mock("@/lib/security/admin-rate-limit", () => ({ assertPersistentRateLimit: m.rate }));
vi.mock("@/features/payments/settings", async (original) => ({ ...await original<typeof import("@/features/payments/settings")>(), getPaymentSettings: m.settings }));
import { createOrder, type ManagedOrder } from "@/features/orders/service";
import { manageOrderAction, reportPaymentAction } from "@/features/orders/actions";
import { paymentSettingsSchema } from "@/features/payments/settings";

const revision = new Date("2026-11-25T12:00:00Z");
function order(status = "DRAFT"): ManagedOrder {
  return { id: "o1", orderNumber: "SOM-o1", customerId: "c1", status, updatedAt: revision, totalMinor: 90000n, currency: "LKR", sourceQuotation: null, pricingSnapshot: { kind: "GOODS", paymentChoice: "BANK", stockConfirmed: status !== "DRAFT", paymentDetails: { bankEnabled: true, bankName: "Bank", accountName: "Shop", accountNumber: "123" } }, items: [{ id: "line", variantId: "v1", quantity: { toString: () => "1" } }], payments: status === "DRAFT" ? [] : [{ id: "pay1", method: "BANK_TRANSFER", amountMinor: 90000n, status: "PENDING", attempts: [] }] } as unknown as ManagedOrder;
}
function form(operation: string, extra: Record<string, string> = {}) {
  const f = new FormData();
  for (const [key, value] of Object.entries({ id: "o1", updatedAt: revision.toISOString(), operation, note: "Shop verified the order", ...extra })) f.set(key, value);
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
  m.settings.mockResolvedValue(paymentSettingsSchema.parse({ bankEnabled: true, bankName: "Bank", accountName: "Shop", accountNumber: "123" }));
  m.customer.mockResolvedValue({ id: "c1", userId: "u1" }); m.admin.mockResolvedValue({ id: "owner" });
  m.transaction.mockImplementation((work) => work(m.tx));
  m.tx.customerProfile.findUniqueOrThrow.mockResolvedValue({ id: "c1", user: { name: "Customer", phone: "+94771234567", phoneVerifiedAt: new Date(), emailVerified: new Date() }, loyaltyMembership: { status: "ACTIVE", expiresAt: null } });
  m.tx.cart.findFirst.mockResolvedValue({ id: "cart1", status: "ACTIVE", expiresAt: null, items: [{ variantId: "v1", quantity: { toString: () => "1" } }] });
  m.tx.productVariant.findMany.mockResolvedValue([{ id: "v1", productId: "p1", sku: "SKU", name: "1 L", minQuantity: { toString: () => "1" }, quantityStep: { toString: () => "1" }, priceOverrideMinor: null, loyaltyPriceMinor: null, product: { name: "Oil", standardPriceMinor: 100000n, loyaltyPriceMinor: 90000n, categoryId: "cat" } }]);
  m.tx.promotion.findMany.mockResolvedValue([]);
  m.tx.order.create.mockResolvedValue({ id: "o1", orderNumber: "SOM-o1", customerId: "c1" });
  m.tx.order.updateMany.mockResolvedValue({ count: 1 });
  m.tx.inventory.findUnique.mockResolvedValue({ id: "stock1", version: 1, quantityOnHand: { toString: () => "3" }, quantityReserved: { toString: () => "1" }, variant: { active: true, product: { status: "ACTIVE" } } });
  m.tx.inventory.updateMany.mockResolvedValue({ count: 1 });
});

describe("checkout request creation", () => {
  const input = { source: "cart" as const, sourceId: "cart1", locale: "en" as const, method: "BANK" as const, expectedTotal: "90000", fingerprint: purchaseFingerprint([{ variantId: "v1", quantity: "1", unitPriceMinor: "90000" }]), sourceVersion: revision.toISOString(), accepted: "on" as const };
  it("reprices trusted variants and creates an unpaid draft without reserving stock", async () => {
    await createOrder("c1", "u1", input);
    expect(m.tx.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", totalMinor: 90000n }) }));
    expect(m.tx.inventory.updateMany).not.toHaveBeenCalled(); expect(m.tx.payment.create).not.toHaveBeenCalled();
    expect(m.tx.cart.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CONVERTED" } }));
  });
  it("returns an existing cart order on retry without duplication", async () => {
    m.tx.order.findUnique.mockResolvedValue({ id: "o1", customerId: "c1" });
    expect((await createOrder("c1", "u1", input)).id).toBe("o1"); expect(m.tx.order.create).not.toHaveBeenCalled();
  });
  it("rejects a changed price or a disabled method", async () => {
    await expect(createOrder("c1", "u1", { ...input, expectedTotal: "1" })).rejects.toThrow("price changed");
    await expect(createOrder("c1", "u1", { ...input, method: "HOSTED" })).rejects.toThrow("unavailable");
    expect(m.tx.order.create).not.toHaveBeenCalled();
  });
  it("does not grant loyalty pricing to an unverified phone", async () => {
    m.tx.customerProfile.findUniqueOrThrow.mockResolvedValue({ id: "c1", user: { phone: "+94771234567", phoneVerifiedAt: null, emailVerified: new Date() }, loyaltyMembership: { status: "ACTIVE", expiresAt: null } });
    await createOrder("c1", "u1", { ...input, expectedTotal: "100000", fingerprint: purchaseFingerprint([{ variantId: "v1", quantity: "1", unitPriceMinor: "100000" }]) });
    expect(m.tx.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalMinor: 100000n, pricingSnapshot: expect.objectContaining({ loyaltyEligible: false }) }) }));
  });
  it("requires pre-order approval and respects expiry", async () => {
    m.tx.preOrder.findFirst.mockResolvedValue({ id: "pre", status: "PENDING_APPROVAL", updatedAt: revision });
    await expect(createOrder("c1", "u1", { ...input, source: "preorder" })).rejects.toThrow("approval");
    m.tx.preOrder.findFirst.mockResolvedValue({ id: "pre", status: "APPROVED", updatedAt: revision, expiresAt: new Date(0) });
    await expect(createOrder("c1", "u1", { ...input, source: "preorder" })).rejects.toThrow("expired");
  });
  it("requires renewed consent when cart items or quotation terms changed", async () => {
    await expect(createOrder("c1", "u1", { ...input, fingerprint: "old-items" })).rejects.toThrow("cart changed");
    m.tx.quotation.findFirst.mockResolvedValue({ id: "q1", status: "PREPARED", updatedAt: new Date(0), feeMinor: 90000n, orderId: null });
    await expect(createOrder("c1", "u1", { ...input, source: "quotation" })).rejects.toThrow("current terms");
    expect(m.tx.order.create).not.toHaveBeenCalled();
  });
  it("creates a quotation fee invoice with no merchandise or stock effects", async () => {
    m.tx.quotation.findFirst.mockResolvedValue({ id: "q1", status: "PREPARED", updatedAt: revision, feeMinor: 125050n, orderId: null, validUntil: null });
    await createOrder("c1", "u1", { ...input, source: "quotation", expectedTotal: "125050" });
    expect(m.tx.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalMinor: 125050n, items: { create: [] }, pricingSnapshot: expect.objectContaining({ kind: "QUOTATION_FEE" }) }) }));
    expect(m.tx.quotation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACCEPTED", feeCollectionEnabled: true }) }));
  });
});

describe("stock-confirmed payment lifecycle", () => {
  it("reserves stock before issuing a payment request and snapshots receiving details", async () => {
    m.tx.order.findUnique.mockResolvedValue(order());
    expect((await manageOrderAction({}, form("CONFIRM"))).message).toBeTruthy();
    expect(m.tx.inventory.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { quantityOnHand: "3", quantityReserved: "2", version: { increment: 1 } } }));
    expect(m.tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", amountMinor: 90000n }) }));
    expect(m.tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pricingSnapshot: expect.objectContaining({ stockConfirmed: true, paymentDetails: expect.objectContaining({ accountNumber: "123" }) }) }) }));
  });
  it("blocks payment release if stock is insufficient or the record is stale", async () => {
    m.tx.order.findUnique.mockResolvedValue(order());
    m.tx.inventory.findUnique.mockResolvedValue({ id: "s", version: 1, quantityOnHand: { toString: () => "0" }, quantityReserved: { toString: () => "0" }, variant: { active: true, product: { status: "ACTIVE" } } });
    expect((await manageOrderAction({}, form("CONFIRM"))).error).toContain("Insufficient"); expect(m.tx.payment.create).not.toHaveBeenCalled();
    expect((await manageOrderAction({}, form("CONFIRM", { updatedAt: new Date(0).toISOString() }))).error).toContain("changed");
  });
  it("treats a customer transfer claim as unverified and enforces ownership", async () => {
    m.tx.order.findUnique.mockResolvedValue(order("PENDING_PAYMENT"));
    const f = new FormData(); Object.entries({ orderId: "o1", updatedAt: revision.toISOString(), reference: "BANK123", accepted: "on" }).forEach(([k, v]) => f.set(k, v));
    expect((await reportPaymentAction({}, f)).message).toContain("unverified");
    expect(m.tx.payment.update).toHaveBeenCalledWith({ where: { id: "pay1" }, data: { status: "AWAITING_VERIFICATION" } });
    expect(m.tx.inventoryAdjustment.create).not.toHaveBeenCalled();
    m.customer.mockResolvedValue({ id: "other", userId: "u2" });
    expect((await reportPaymentAction({}, f)).error).toContain("not found");
  });
  it("requires actual receipt and exact amount before stock is committed", async () => {
    m.tx.order.findUnique.mockResolvedValue(order("PENDING_PAYMENT"));
    expect((await manageOrderAction({}, form("VERIFY_PAYMENT", { receivedMinor: "90000", reference: "B1" }))).error).toBeTruthy();
    expect((await manageOrderAction({}, form("VERIFY_PAYMENT", { receivedMinor: "1", reference: "BANK123", verified: "on" }))).error).toContain("exactly");
    expect(m.tx.inventoryAdjustment.create).not.toHaveBeenCalled();
    expect((await manageOrderAction({}, form("VERIFY_PAYMENT", { receivedMinor: "90000", reference: "BANK123", verified: "on" }))).message).toBeTruthy();
    expect(m.tx.inventoryAdjustment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "SALE", quantityDelta: "-1", idempotencyKey: "order-sale:o1:line" }) }));
    m.tx.order.findUnique.mockResolvedValue(order("PAID"));
    expect((await manageOrderAction({}, form("VERIFY_PAYMENT", { receivedMinor: "90000", reference: "BANK123", verified: "on" }))).error).toBeTruthy();
    expect(m.tx.inventoryAdjustment.create).toHaveBeenCalledTimes(1);
  });
  it("releases reserved stock on unpaid cancellation but blocks cancellation of reported funds", async () => {
    m.tx.order.findUnique.mockResolvedValue(order("PENDING_PAYMENT"));
    expect((await manageOrderAction({}, form("CANCEL"))).message).toBeTruthy();
    expect(m.tx.inventory.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantityOnHand: "3", quantityReserved: "0" }) }));
    m.tx.order.findUnique.mockResolvedValue(order("AWAITING_MANUAL_VERIFICATION"));
    expect((await manageOrderAction({}, form("CANCEL"))).error).toContain("payment was reported");
  });
  it("rejects unauthorized admin writes", async () => {
    m.admin.mockRejectedValue(new Error("Forbidden"));
    expect((await manageOrderAction({}, form("CONFIRM"))).error).toBeTruthy(); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("publishes a merchant link for a confirmed exact amount without marking paid", async () => {
    const settings = paymentSettingsSchema.parse({ hostedEnabled: true, hostedName: "Provider", hostedHost: "checkout.example.com" });
    m.settings.mockResolvedValue(settings);
    const row = order("PENDING_PAYMENT");
    row.payments[0]!.method = "ONLINE_PROVIDER";
    row.pricingSnapshot = { kind: "GOODS", stockConfirmed: true, paymentChoice: "HOSTED", paymentDetails: settings };
    m.tx.order.findUnique.mockResolvedValue(row);
    expect((await manageOrderAction({}, form("PAYMENT_LINK", { paymentUrl: "https://checkout.example.com/pay/unique", expiresAt: new Date(Date.now() + 60000).toISOString() }))).message).toBeTruthy();
    expect(m.tx.paymentAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", requestMetadata: expect.objectContaining({ amountMinor: "90000", currency: "LKR" }) }) }));
    expect(m.tx.payment.update).not.toHaveBeenCalled();
  });
  it("blocks foreign-domain and expired payment links", async () => {
    const settings = paymentSettingsSchema.parse({ hostedEnabled: true, hostedName: "Provider", hostedHost: "checkout.example.com" });
    m.settings.mockResolvedValue(settings);
    const row = order("PENDING_PAYMENT"); row.payments[0]!.method = "ONLINE_PROVIDER";
    row.pricingSnapshot = { kind: "GOODS", stockConfirmed: true, paymentDetails: settings };
    m.tx.order.findUnique.mockResolvedValue(row);
    expect((await manageOrderAction({}, form("PAYMENT_LINK", { paymentUrl: "https://wrong.example.com/pay", expiresAt: new Date(Date.now() + 60000).toISOString() }))).error).toBeTruthy();
    expect((await manageOrderAction({}, form("PAYMENT_LINK", { paymentUrl: "https://checkout.example.com/pay", expiresAt: new Date(0).toISOString() }))).error).toContain("future expiry");
    expect(m.tx.paymentAttempt.create).not.toHaveBeenCalled();
  });
  it("resolves an unreceived payment report without consuming stock", async () => {
    m.tx.order.findUnique.mockResolvedValue(order("AWAITING_MANUAL_VERIFICATION"));
    expect((await manageOrderAction({}, form("REJECT_REPORT"))).message).toBeTruthy();
    expect(m.tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING_PAYMENT" }) }));
    expect(m.tx.inventory.updateMany).not.toHaveBeenCalled(); expect(m.tx.inventoryAdjustment.create).not.toHaveBeenCalled();
  });
});

describe("measured stock arithmetic", () => {
  it("handles fractions exactly and refuses unbacked reservations", () => {
    expect(stockMovement("2.5", "0.5", "0.3", "reserve")).toEqual({ onHand: "2.5", reserved: "0.8" });
    expect(stockMovement("2.5", "0.8", "0.3", "commit")).toEqual({ onHand: "2.2", reserved: "0.5" });
    expect(() => stockMovement("1", "0.1", "0.5", "release")).toThrow(CommerceError);
  });
});
