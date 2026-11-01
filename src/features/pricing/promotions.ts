import { DiscountScope, PromotionType } from "@/generated/prisma/client";

export type ApplicablePromotion = {
  id: string;
  type: PromotionType;
  scope: DiscountScope;
  percentageBasisPoints: number | null;
  amountMinor: bigint | null;
  priority: number;
  loyaltyOnly: boolean;
  productIds: readonly string[];
  categoryIds: readonly string[];
};

export function resolvePromotionUnitPrice(input: {
  productId: string;
  categoryId: string;
  baseUnitPriceMinor: bigint;
  loyaltyEligible: boolean;
  promotions: readonly ApplicablePromotion[];
}) {
  const candidates = input.promotions.flatMap((promotion) => {
    if (promotion.loyaltyOnly && !input.loyaltyEligible) return [];
    const applies = promotion.scope === DiscountScope.PRODUCT
      ? promotion.productIds.includes(input.productId)
      : promotion.scope === DiscountScope.CATEGORY
        ? promotion.categoryIds.includes(input.categoryId)
        : false;
    if (!applies) return [];
    let unitPrice = input.baseUnitPriceMinor;
    if (promotion.type === PromotionType.PERCENTAGE && promotion.percentageBasisPoints) {
      unitPrice -= (unitPrice * BigInt(promotion.percentageBasisPoints)) / 10_000n;
    } else if (promotion.type === PromotionType.FIXED_AMOUNT && promotion.amountMinor) {
      unitPrice -= promotion.amountMinor;
    } else if (promotion.type === PromotionType.FIXED_PRICE && promotion.amountMinor) {
      unitPrice = promotion.amountMinor;
    }
    unitPrice = unitPrice < 0n ? 0n : unitPrice > input.baseUnitPriceMinor ? input.baseUnitPriceMinor : unitPrice;
    return [{ id: promotion.id, priority: promotion.priority, unitPriceMinor: unitPrice }];
  });
  candidates.sort((a, b) => a.unitPriceMinor === b.unitPriceMinor ? b.priority - a.priority || a.id.localeCompare(b.id) : a.unitPriceMinor < b.unitPriceMinor ? -1 : 1);
  return candidates[0] ?? null;
}
