import { describe, expect, it } from "vitest";

import { isOtpChallengeUsable, normalizeSriLankanMobile } from "@/features/customer/verification/phone";

describe("customer phone verification", () => {
  it.each([
    ["077 123 4567", "+94771234567"],
    ["+94 77 123 4567", "+94771234567"],
    ["94771234567", "+94771234567"],
  ])("normalizes Sri Lankan mobile input", (input, expected) => {
    expect(normalizeSriLankanMobile(input)).toBe(expected);
  });

  it("rejects non-mobile and malformed numbers", () => {
    expect(() => normalizeSriLankanMobile("0112345678")).toThrow(/valid Sri Lankan mobile/);
    expect(() => normalizeSriLankanMobile("07712")).toThrow();
  });

  it("enforces expiry, consumption, and attempt limits", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(isOtpChallengeUsable({ consumedAt: null, expiresAt: new Date("2026-10-30T12:01:00Z"), attempts: 4, maxAttempts: 5 }, now)).toBe(true);
    expect(isOtpChallengeUsable({ consumedAt: null, expiresAt: now, attempts: 0, maxAttempts: 5 }, now)).toBe(false);
    expect(isOtpChallengeUsable({ consumedAt: now, expiresAt: new Date("2026-10-30T12:01:00Z"), attempts: 0, maxAttempts: 5 }, now)).toBe(false);
    expect(isOtpChallengeUsable({ consumedAt: null, expiresAt: new Date("2026-10-30T12:01:00Z"), attempts: 5, maxAttempts: 5 }, now)).toBe(false);
  });
});
