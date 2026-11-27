import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ customer: vi.fn(), admin: vi.fn(), transaction: vi.fn(), applicant: vi.fn(), current: vi.fn(), membership: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, history: vi.fn(), audit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/customer/auth/authorization", () => ({ requireCustomer: m.customer }));
vi.mock("@/features/admin/auth/authorization", () => ({ requireAdmin: m.admin }));
vi.mock("@/features/admin/audit", () => ({ writeAudit: m.audit }));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: m.transaction, loyaltyMembership: { findUniqueOrThrow: m.current, findUnique: m.membership.findUnique } } }));
import { applyForLoyaltyAction, decideLoyaltyAction } from "@/features/customer/loyalty/actions";
import { loyaltyContactsVerified } from "@/features/customer/loyalty/eligibility";
const verified = () => ({ emailVerified: new Date(), phone: "+94771234567", phoneVerifiedAt: new Date() });
beforeEach(() => {
  vi.resetAllMocks();
  m.customer.mockResolvedValue({ id: "c1", userId: "u1", user: verified() }); m.admin.mockResolvedValue({ id: "admin1" });
  m.membership.findUnique.mockResolvedValue(null); m.membership.create.mockResolvedValue({ id: "loyalty1" });
  m.applicant.mockResolvedValue({ user: verified() }); m.current.mockResolvedValue({ id: "loyalty1", customerId: "c1", status: "PENDING" });
  m.membership.update.mockResolvedValue({ id: "loyalty1", status: "ACTIVE" });
  m.transaction.mockImplementation(work => work({ customerProfile: { findUnique: m.applicant }, loyaltyMembership: m.membership, loyaltyDecisionHistory: { create: m.history } }));
});
describe("loyalty phone verification gate", () => {
  it("needs a current phone and both verification markers", () => {
    expect(loyaltyContactsVerified(verified())).toBe(true);
    expect(loyaltyContactsVerified({ ...verified(), phoneVerifiedAt: null })).toBe(false);
    expect(loyaltyContactsVerified({ ...verified(), phone: null })).toBe(false);
    expect(loyaltyContactsVerified({ ...verified(), emailVerified: null })).toBe(false);
  });
  it("rejects application before any database write when the phone is unverified", async () => {
    m.customer.mockResolvedValue({ id: "c1", userId: "u1", user: { ...verified(), phoneVerifiedAt: null } });
    await expect(applyForLoyaltyAction()).rejects.toThrow("Verify your mobile");
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("submits a verified account for approval without autoactivating it", async () => {
    await applyForLoyaltyAction();
    expect(m.membership.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) }));
    expect(m.history).toHaveBeenCalledOnce();
  });
  it("rejects approval if verification was not completed", async () => {
    m.applicant.mockResolvedValue({ user: { ...verified(), phoneVerifiedAt: null } });
    const form = new FormData(); form.set("id", "loyalty1"); form.set("status", "ACTIVE");
    await expect(decideLoyaltyAction(form)).rejects.toThrow("must verify");
    expect(m.membership.update).not.toHaveBeenCalled();
  });
  it("activates a verified account with an audited decision", async () => {
    const form = new FormData(); form.set("id", "loyalty1"); form.set("status", "ACTIVE");
    await decideLoyaltyAction(form);
    expect(m.admin).toHaveBeenCalledWith("loyalty.manage");
    expect(m.membership.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE", approvedById: "admin1" }) }));
    expect(m.audit).toHaveBeenCalled();
  });
});
