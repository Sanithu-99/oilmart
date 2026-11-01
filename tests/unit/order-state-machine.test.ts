import { describe, expect, it } from "vitest";

import { assertOrderTransition, canTransitionOrder } from "@/features/orders/state-machine";

describe("order state machine", () => {
  it("allows an offline payment to wait for manual verification", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "AWAITING_MANUAL_VERIFICATION")).toBe(true);
  });

  it("does not allow unpaid orders to skip to processing", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "PROCESSING")).toBe(false);
    expect(() => assertOrderTransition("PENDING_PAYMENT", "PROCESSING")).toThrow(
      "not allowed",
    );
  });

  it("does not allow refunded orders to transition again", () => {
    expect(canTransitionOrder("REFUNDED", "PROCESSING")).toBe(false);
  });
});
