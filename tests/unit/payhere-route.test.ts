import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ process: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("@/features/payments/payhere-notification", () => ({ processPayHereNotification: m.process }));
import { POST } from "@/app/api/payments/payhere/notify/route";
const request = (body: string, type = "application/x-www-form-urlencoded") => new Request("https://shop.example/api/payments/payhere/notify", { method: "POST", headers: { "content-type": type }, body });
beforeEach(() => { vi.resetAllMocks(); m.process.mockResolvedValue({ status: 200, message: "Payment verified." }); });
describe("provider callback HTTP boundary", () => {
  it("rejects JSON and duplicate fields before verification", async () => {
    expect((await POST(request("{}", "application/json"))).status).toBe(415);
    expect((await POST(request("order_id=one&order_id=two"))).status).toBe(400);
    expect(m.process).not.toHaveBeenCalled();
  });
  it("enforces the body size even when Content-Length is absent", async () => {
    expect((await POST(request(`padding=${"a".repeat(16385)}`))).status).toBe(413); expect(m.process).not.toHaveBeenCalled();
  });
  it("passes form parameters to signature verification and never trusts a browser redirect", async () => {
    const response = await POST(request("merchant_id=123456&order_id=attempt")); expect(response.status).toBe(200);
    expect(m.process).toHaveBeenCalledWith({ merchant_id: "123456", order_id: "attempt" }); expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("returns retryable failure when the transaction rolls back", async () => {
    m.process.mockRejectedValue(new Error("Serialization failure")); expect((await POST(request("order_id=attempt"))).status).toBe(503); expect(m.revalidate).not.toHaveBeenCalled();
  });
});
