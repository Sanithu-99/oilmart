import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => {
  const challenge = { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() };
  return { challenge, transaction: vi.fn(), userUpdate: vi.fn(), ready: vi.fn(), send: vi.fn(), rate: vi.fn() };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ SMS_PROVIDER: "sms-gate", AUTH_SECRET: "testing-secret-with-more-than-32-characters" }) }));
vi.mock("@/lib/db/client", () => ({ db: { $transaction: m.transaction, phoneVerificationChallenge: m.challenge } }));
vi.mock("@/lib/security/admin-rate-limit", () => ({ assertPersistentRateLimit: m.rate }));
vi.mock("@/features/customer/verification/sms-provider", () => ({ smsGatewayReady: m.ready, sendPhoneOtp: m.send }));
import { issuePhoneOtp, verifyPhoneOtp } from "@/features/customer/verification/sms";

beforeEach(() => {
  vi.resetAllMocks();
  m.ready.mockReturnValue(true); m.send.mockResolvedValue(true);
  m.transaction.mockImplementation((work) => work({ phoneVerificationChallenge: m.challenge, user: { update: m.userUpdate } }));
  m.challenge.findFirst.mockResolvedValue(null); m.challenge.updateMany.mockResolvedValue({ count: 1 });
});
describe("SMS verification challenges", () => {
  it("does not create a challenge or claim delivery without a configured device gateway", async () => {
    m.ready.mockReturnValue(false);
    expect((await issuePhoneOtp("u1", "0771234567")).status).toBe("unavailable");
    expect(m.challenge.create).not.toHaveBeenCalled(); expect(m.send).not.toHaveBeenCalled();
  });
  it("stores only an HMAC, sends a six-digit code, and accepts it exactly once", async () => {
    const result = await issuePhoneOtp("u1", "0771234567");
    expect(result.status).toBe("queued"); expect(result).not.toHaveProperty("code");
    const row = m.challenge.create.mock.calls[0]![0].data;
    const code = m.send.mock.calls[0]![1];
    expect(code).toMatch(/^\d{6}$/); expect(row.otpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row).not.toHaveProperty("code");
    expect(row.otpHash).not.toBe(code);
    m.challenge.findFirst.mockResolvedValue({ ...row, attempts: 0, maxAttempts: 5, consumedAt: null });
    expect(await verifyPhoneOtp("u1", row.id, code)).toBe(true);
    expect(m.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phone: "+94771234567" }) }));
    m.challenge.findFirst.mockResolvedValue({ ...row, attempts: 0, maxAttempts: 5, consumedAt: new Date() });
    expect(await verifyPhoneOtp("u1", row.id, code)).toBe(false);
    expect(m.userUpdate).toHaveBeenCalledTimes(1);
  });
  it("invalidates an unsent code when the gateway fails", async () => {
    m.send.mockRejectedValue(new Error("device offline"));
    await expect(issuePhoneOtp("u1", "0771234567")).rejects.toThrow("could not be queued");
    expect(m.challenge.update).toHaveBeenCalledWith(expect.objectContaining({ data: { consumedAt: expect.any(Date) } }));
  });
  it("enforces resend cooldown before sending another code", async () => {
    m.challenge.findFirst.mockResolvedValue({ resendAvailableAt: new Date(Date.now() + 60000) });
    await expect(issuePhoneOtp("u1", "0771234567")).rejects.toThrow("wait");
    expect(m.challenge.create).not.toHaveBeenCalled(); expect(m.send).not.toHaveBeenCalled();
  });
});
