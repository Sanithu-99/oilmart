import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    product: { findFirst: vi.fn() },
    quotation: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    preOrder: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    quotationHistory: { create: vi.fn() }, preOrderHistory: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(), customer: vi.fn(), admin: vi.fn(), audit: vi.fn(), rate: vi.fn() };
});
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("@/features/customer/auth/authorization", () => ({ requireCustomer: mocks.customer }));
vi.mock("@/features/admin/auth/authorization", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/features/admin/audit", () => ({ writeAudit: mocks.audit }));
vi.mock("@/lib/security/admin-rate-limit", () => ({ assertPersistentRateLimit: mocks.rate }));

import { reviewRequestAction, submitRequestAction } from "@/features/requests/actions";

function request(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ kind: "quote", requestKey: "b2249299-b674-49da-abd5-92eb9a203a91", locale: "en", name: "Customer", phone: "0771234567", vehicle: "Vehicle 1", notes: "Please prepare a quotation", productSlug: "", variantId: "", quantity: "1", accepted: "on", ...overrides })) form.set(key, value);
  return form;
}
function review(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ id: "q1", kind: "quote", updatedAt: "2026-11-25T00:00:00.000Z", decision: "PREPARED", notes: "Vehicle-specific quotation fee", fee: "1250.50", ...overrides })) form.set(key, value);
  return form;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.customer.mockResolvedValue({ id: "c1", userId: "u1", user: { emailVerified: new Date(), email: "customer@example.test" } });
  mocks.admin.mockResolvedValue({ id: "owner" });
  mocks.transaction.mockImplementation((work) => work(mocks.tx));
  mocks.tx.quotation.findUnique.mockResolvedValue(null);
  mocks.tx.preOrder.findUnique.mockResolvedValue(null);
});

describe("customer requests", () => {
  it("creates an individual quotation without collecting a fee", async () => {
    const result = await submitRequestAction({}, request());
    expect(result.reference).toMatch(/^QUO-/);
    expect(mocks.tx.quotation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: "c1", status: "REQUESTED", feePaid: false, feeCollectionEnabled: false }) }));
  });
  it("requires verified customer authentication before database changes", async () => {
    mocks.customer.mockRejectedValue(new Error("Not authenticated"));
    expect((await submitRequestAction({}, request())).error).toBeTruthy();
    expect(mocks.transaction).not.toHaveBeenCalled();
    mocks.customer.mockResolvedValue({ user: { emailVerified: null } });
    expect((await submitRequestAction({}, request())).error).toBeTruthy();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("deduplicates retry and rejects another customer's reference", async () => {
    mocks.tx.quotation.findUnique.mockResolvedValue({ customerId: "c1" });
    expect((await submitRequestAction({}, request())).reference).toBeTruthy();
    expect(mocks.tx.quotation.create).not.toHaveBeenCalled();
    mocks.tx.quotation.findUnique.mockResolvedValue({ customerId: "other" });
    expect((await submitRequestAction({}, request())).error).toBeTruthy();
  });
  it("rejects a pre-order when the product has not opted in", async () => {
    mocks.tx.product.findFirst.mockResolvedValue({ id: "p1", acceptsPreOrders: false, variants: [{ id: "v1" }] });
    expect((await submitRequestAction({}, request({ kind: "preorder", productSlug: "oil", variantId: "v1" }))).error).toBeTruthy();
    expect(mocks.tx.preOrder.create).not.toHaveBeenCalled();
  });
  it("saves an enabled pre-order as pending approval with the selected variant", async () => {
    mocks.tx.product.findFirst.mockResolvedValue({ id: "p1", acceptsPreOrders: true, variants: [{ id: "v1", minQuantity: "0.5", quantityStep: "0.5" }] });
    expect((await submitRequestAction({}, request({ kind: "preorder", productSlug: "oil", variantId: "v1", quantity: "1.5" }))).reference).toMatch(/^PRE-/);
    expect(mocks.tx.preOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ variantId: "v1", quantity: "1.5", status: "PENDING_APPROVAL" }) }));
  });
  it("rejects a mismatched size and an invalid measured increment", async () => {
    mocks.tx.product.findFirst.mockResolvedValue({ id: "p1", acceptsPreOrders: true, variants: [{ id: "v1", minQuantity: "0.5", quantityStep: "0.5" }] });
    expect((await submitRequestAction({}, request({ kind: "preorder", productSlug: "oil", variantId: "v2" }))).error).toBeTruthy();
    expect((await submitRequestAction({}, request({ kind: "preorder", productSlug: "oil", variantId: "v1", quantity: "0.7" }))).error).toBeTruthy();
    expect(mocks.tx.preOrder.create).not.toHaveBeenCalled();
  });
});

describe("shop review", () => {
  it("checks permission and records an exact fee without marking paid", async () => {
    mocks.tx.quotation.findUniqueOrThrow.mockResolvedValue({ id: "q1", status: "REQUESTED", feeMinor: 0n });
    mocks.tx.quotation.updateMany.mockResolvedValue({ count: 1 });
    expect((await reviewRequestAction({}, review())).reference).toBeTruthy();
    expect(mocks.admin).toHaveBeenCalledWith("quotations.manage");
    expect(mocks.tx.quotation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ feeMinor: 125050n, feePaid: false, feeCollectionEnabled: false }) }));
    expect(mocks.tx.quotationHistory.create).toHaveBeenCalledOnce();
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("rejects unauthorized or stale review without history side effects", async () => {
    mocks.admin.mockRejectedValueOnce(new Error("Forbidden"));
    expect((await reviewRequestAction({}, review())).error).toBeTruthy();
    expect(mocks.transaction).not.toHaveBeenCalled();
    mocks.tx.quotation.findUniqueOrThrow.mockResolvedValue({ id: "q1", status: "REQUESTED", feeMinor: 0n });
    mocks.tx.quotation.updateMany.mockResolvedValue({ count: 0 });
    expect((await reviewRequestAction({}, review())).error).toContain("changed");
    expect(mocks.tx.quotationHistory.create).not.toHaveBeenCalled();
  });
});
