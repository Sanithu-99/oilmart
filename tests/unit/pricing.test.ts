import { describe, expect, it } from "vitest";

import { calculatePrice } from "@/features/pricing/service";
import { resolvePromotionUnitPrice } from "@/features/pricing/promotions";
import { DiscountScope, PromotionType } from "@/generated/prisma/client";
import { multiplyMinorUnits, percentageDiscount } from "@/lib/pricing/money";

describe("pricing", () => {
  it("uses exact decimal quantities for loose oil", () => {
    expect(multiplyMinorUnits(250_00n, "1.5")).toBe(375_00n);
  });

  it("calculates discounts with integer basis points", () => {
    expect(percentageDiscount(10_000n, 1250)).toBe(1_250n);
  });

  it("uses loyalty price only for eligible customers", () => {
    const line = {
      productId: "product-1",
      quantity: "2",
      standardUnitPriceMinor: 5_000n,
      loyaltyUnitPriceMinor: 4_500n,
      promotionBasisPoints: 1000,
    };

    const standard = calculatePrice([line], { loyaltyEligible: false });
    const loyalty = calculatePrice([line], { loyaltyEligible: true });

    expect(standard.totalMinor).toBe(9_000n);
    expect(loyalty.totalMinor).toBe(8_100n);
    expect(loyalty.lines[0]?.priceSource).toBe("LOYALTY");
  });

  it("keeps payment surcharge disabled unless explicitly supplied", () => {
    const result = calculatePrice(
      [{ productId: "p", quantity: "1", standardUnitPriceMinor: 10_000n }],
      { loyaltyEligible: false },
    );

    expect(result.surchargeMinor).toBe(0n);
    expect(result.totalMinor).toBe(10_000n);
  });

  it("chooses the deterministic lowest promotion and never makes a price negative", () => {
    const promotion = resolvePromotionUnitPrice({
      productId: "p1", categoryId: "c1", baseUnitPriceMinor: 10_000n, loyaltyEligible: false,
      promotions: [
        { id: "later", type: PromotionType.PERCENTAGE, scope: DiscountScope.PRODUCT, percentageBasisPoints: 1000, amountMinor: null, priority: 5, loyaltyOnly: false, productIds: ["p1"], categoryIds: [] },
        { id: "best", type: PromotionType.FIXED_AMOUNT, scope: DiscountScope.CATEGORY, percentageBasisPoints: null, amountMinor: 20_000n, priority: 1, loyaltyOnly: false, productIds: [], categoryIds: ["c1"] },
      ],
    });
    expect(promotion).toMatchObject({ id: "best", unitPriceMinor: 0n });
    const priced = calculatePrice([{ productId: "p1", quantity: "1.5", standardUnitPriceMinor: 10_000n, promotionUnitPriceMinor: promotion?.unitPriceMinor }], { loyaltyEligible: false });
    expect(priced.totalMinor).toBe(0n);
    expect(priced.lines[0]?.priceSource).toBe("PROMOTION");
  });

  it("applies an eligible promotion to the loyalty base price without stacking ambiguously", () => {
    const promotion = resolvePromotionUnitPrice({
      productId: "p1", categoryId: "c1", baseUnitPriceMinor: 8_000n, loyaltyEligible: true,
      promotions: [{ id: "member-sale", type: PromotionType.PERCENTAGE, scope: DiscountScope.PRODUCT, percentageBasisPoints: 1000, amountMinor: null, priority: 1, loyaltyOnly: true, productIds: ["p1"], categoryIds: [] }],
    });
    const result = calculatePrice([{ productId: "p1", quantity: "1", standardUnitPriceMinor: 10_000n, loyaltyUnitPriceMinor: 8_000n, promotionUnitPriceMinor: promotion?.unitPriceMinor }], { loyaltyEligible: true });
    expect(result.lines[0]).toMatchObject({ unitPriceMinor: 7_200n, lineTotalMinor: 7_200n, priceSource: "PROMOTION" });
  });
});
