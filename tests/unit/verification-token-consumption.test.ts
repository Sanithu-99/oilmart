import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: m.transaction } }));
import { consumeVerificationToken } from "@/features/customer/auth/tokens";
beforeEach(() => {
  vi.resetAllMocks();
  m.transaction.mockImplementation(work => work({ verificationToken: { findFirst: m.findFirst, deleteMany: m.deleteMany } }));
});
describe("verification link conditional consumption", () => {
  it("does not accept an expired or missing token", async () => {
    m.findFirst.mockResolvedValue(null);
    expect(await consumeVerificationToken("Customer@Example.com", "one-time-secret", "purpose")).toBe(false);
    expect(m.deleteMany).not.toHaveBeenCalled();
  });
  it("rechecks purpose, recipient and expiry when consuming", async () => {
    m.findFirst.mockResolvedValue({ tokenHash: "exists" }); m.deleteMany.mockResolvedValue({ count: 1 });
    expect(await consumeVerificationToken("Customer@Example.com", "one-time-secret", "purpose")).toBe(true);
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), identifier: "customer@example.com", purpose: "purpose", expires: { gt: expect.any(Date) } } });
  });
  it("loses safely if a concurrent request consumed the same token", async () => {
    m.findFirst.mockResolvedValue({ tokenHash: "exists" }); m.deleteMany.mockResolvedValue({ count: 0 });
    expect(await consumeVerificationToken("customer@example.com", "one-time-secret", "purpose")).toBe(false);
  });
});
