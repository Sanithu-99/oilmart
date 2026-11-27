import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ env: {} as Record<string, string>, create: vi.fn(), update: vi.fn(), fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getEnv: () => m.env }));
vi.mock("@/lib/db/client", () => ({ db: { notification: { create: m.create, update: m.update } } }));
import { dispatchCustomerEmail } from "@/features/customer/verification/email";
const input = { customerId: "c1", recipient: "customer@example.com", templateKey: "customer-email-verification", subject: "Verify your account", actionUrl: "https://shop.example.com/en/verify-email?token=private-one-time-token" };

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("NODE_ENV", "test"); vi.stubGlobal("fetch", m.fetch);
  m.env = { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_testing-not-a-real-key", EMAIL_FROM: "Oil Mart <accounts@example.com>", APP_URL: "https://shop.example.com" };
  m.create.mockResolvedValue({ id: "n1" }); m.update.mockResolvedValue({});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("transactional verification email", () => {
  it("fails closed for a missing or unsupported provider", async () => {
    m.env.EMAIL_PROVIDER = "anything";
    expect(await dispatchCustomerEmail(input)).toEqual({ status: "unavailable" });
    expect(m.fetch).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it("does not expose a development link in production", async () => {
    vi.stubEnv("NODE_ENV", "production"); m.env.EMAIL_PROVIDER = "development";
    expect(await dispatchCustomerEmail(input)).toEqual({ status: "unavailable" });
  });
  it("submits a real provider request while keeping bearer URLs out of stored notifications", async () => {
    m.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "provider-message-1" }), { status: 200 }));
    expect(await dispatchCustomerEmail(input)).toEqual({ status: "queued" });
    expect(m.fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ redirect: "error", method: "POST", headers: expect.objectContaining({ authorization: "Bearer re_testing-not-a-real-key", "idempotency-key": expect.stringMatching(/^[a-f0-9]{64}$/) }) }));
    expect(JSON.stringify(m.fetch.mock.calls[0]![1])).toContain("private-one-time-token");
    expect(JSON.stringify(m.create.mock.calls)).not.toContain("private-one-time-token");
    expect(JSON.stringify(m.update.mock.calls)).not.toContain("private-one-time-token");
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENT", payload: { provider: "resend", providerMessageId: "provider-message-1" } }) }));
  });
  it("reports provider failure without claiming that a stored outbox entry was sent", async () => {
    m.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "private provider information" }), { status: 429 }));
    expect(await dispatchCustomerEmail(input)).toEqual({ status: "failed" });
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }));
    expect(JSON.stringify(m.update.mock.calls)).not.toContain("private provider information");
  });
  it("rejects a foreign action URL without transmitting the token", async () => {
    expect(await dispatchCustomerEmail({ ...input, actionUrl: "https://attacker.example/reset?token=secret" })).toEqual({ status: "failed" });
    expect(m.fetch).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it("requires a provider message acknowledgement", async () => {
    m.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await dispatchCustomerEmail(input)).toEqual({ status: "failed" });
  });
});
