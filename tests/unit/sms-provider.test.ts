import { beforeEach, describe, expect, it, vi } from "vitest";
const { env, fetchMock } = vi.hoisted(() => ({ env: { SMS_PROVIDER: "sms-gate", SMS_GATE_URL: "https://sms.example.com/3rdparty/v1", SMS_GATE_TOKEN: "private-token-for-tests", SMS_GATE_DEVICE_ID: "dad-phone" }, fetchMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getEnv: () => env }));
import { sendPhoneOtp, smsGatewayReady } from "@/features/customer/verification/sms-provider";

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", fetchMock); Object.assign(env, { SMS_PROVIDER: "sms-gate", SMS_GATE_URL: "https://sms.example.com/3rdparty/v1", SMS_GATE_TOKEN: "private-token-for-tests", SMS_GATE_DEVICE_ID: "dad-phone" }); });
describe("phone-backed OTP gateway", () => {
  it("does not claim delivery or send when credentials are missing", async () => {
    env.SMS_GATE_TOKEN = "";
    expect(smsGatewayReady()).toBe(false);
    expect(await sendPhoneOtp("+94771234567", "123456", "challenge")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses authenticated HTTPS, the device, a unique message ID and expiry", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: "challenge", state: "Pending" }) });
    expect(await sendPhoneOtp("+94771234567", "123456", "challenge")).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://sms.example.com/3rdparty/v1/messages", expect.objectContaining({ redirect: "error", headers: expect.objectContaining({ authorization: "Bearer private-token-for-tests" }) }));
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(sent).toMatchObject({ id: "challenge", phoneNumbers: ["+94771234567"], deviceId: "dad-phone", ttl: 600 });
    expect(sent.textMessage.text).toContain("123456");
  });
  it("rejects insecure transport and public-cloud plaintext for verification codes", async () => {
    env.SMS_GATE_URL = "http://sms.example.com/3rdparty/v1";
    await expect(sendPhoneOtp("+94771234567", "123456", "c")).rejects.toThrow("secure");
    env.SMS_GATE_URL = "https://api.sms-gate.app/3rdparty/v1";
    await expect(sendPhoneOtp("+94771234567", "123456", "c")).rejects.toThrow("private");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not claim success when the device gateway rejects or returns failure", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(sendPhoneOtp("+94771234567", "123456", "c")).rejects.toThrow("could not accept");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "c", state: "Failed" }) });
    await expect(sendPhoneOtp("+94771234567", "123456", "c")).rejects.toThrow("could not accept");
  });
});
