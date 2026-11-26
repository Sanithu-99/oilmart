import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));
import { hostedPaymentUrl, assertQuantity, checkoutSchema } from "@/features/orders/rules";
import { currentHostedLink, paymentQr } from "@/features/payments/qr";
import { enabledPaymentMethods, paymentSettingsSchema } from "@/features/payments/settings";
import type { ManagedOrder } from "@/features/orders/service";

const now = new Date("2026-11-25T12:00:00Z");
function linkedOrder(): ManagedOrder {
  return { status: "PENDING_PAYMENT", totalMinor: 10000n, currency: "LKR", payments: [{ method: "ONLINE_PROVIDER", status: "PENDING", attempts: [{ status: "PENDING", requestMetadata: { amountMinor: "10000", currency: "LKR" }, responseMetadata: { url: "https://checkout.example.com/pay/unique", expiresAt: "2026-11-25T13:00:00Z" } }] }] } as unknown as ManagedOrder;
}
beforeEach(() => vi.clearAllMocks());
describe("payment configuration and hosted links", () => {
  it("defaults to cash and requires verified receiving details for other methods", () => {
    expect(enabledPaymentMethods(paymentSettingsSchema.parse({}))).toEqual(["CASH"]);
    expect(paymentSettingsSchema.safeParse({ bankEnabled: true }).success).toBe(false);
    expect(paymentSettingsSchema.safeParse({ phoneEnabled: true, receivingPhone: "+94771234567" }).success).toBe(false);
    expect(paymentSettingsSchema.safeParse({ hostedEnabled: true, hostedName: "Gateway", hostedHost: "https://example.com/pay" }).success).toBe(false);
  });
  it("only accepts the exact HTTPS provider domain without credentials", () => {
    expect(hostedPaymentUrl("https://checkout.example.com/pay/1", "checkout.example.com")).toContain("/pay/1");
    for (const value of ["http://checkout.example.com/pay", "https://checkout.example.com.evil.test/pay", "javascript:alert(1)", "https://user:pass@checkout.example.com/pay", "https://checkout.example.com:444/pay"]) expect(() => hostedPaymentUrl(value, "checkout.example.com")).toThrow();
  });
  it("hides links before stock confirmation, after expiry or when totals differ", () => {
    const row = linkedOrder();
    expect(currentHostedLink(row, "checkout.example.com", now)).toContain("/pay/unique");
    row.status = "DRAFT";
    expect(currentHostedLink(row, "checkout.example.com", now)).toBeNull();
    row.status = "PENDING_PAYMENT";
    expect(currentHostedLink(row, "checkout.example.com", new Date("2026-11-26"))).toBeNull();
    row.totalMinor = 20000n;
    expect(currentHostedLink(row, "checkout.example.com", now)).toBeNull();
  });
  it("renders an actual PNG QR per request", async () => {
    const one = await paymentQr("https://example.com/orders/one"), two = await paymentQr("https://example.com/orders/two");
    expect(one).toMatch(/^data:image\/png;base64,/);
    expect(one).not.toEqual(two);
  });
});
describe("checkout input", () => {
  it("requires explicit acknowledgement and a supported method", () => {
    const input = { source: "cart", sourceId: "c1", locale: "en", method: "CASH", expectedTotal: "10000", accepted: "on" };
    expect(checkoutSchema.safeParse(input).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...input, accepted: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...input, method: "CARD_SURCHARGE" }).success).toBe(false);
  });
  it("rejects invalid measured quantities", () => {
    expect(() => assertQuantity("1.5", "0.5", "0.5")).not.toThrow();
    for (const [quantity, minimum, step] of [["-1", "1", "1"], ["0.7", "0.5", "0.5"], ["1", "1", "0"], ["0.0001", "0.0001", "0.0001"]]) expect(() => assertQuantity(quantity!, minimum!, step!)).toThrow();
  });
});
