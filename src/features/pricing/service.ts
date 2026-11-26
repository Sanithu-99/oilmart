import { multiplyMinorUnits, percentageDiscount } from "@/lib/pricing/money";

export type PricingLine = Readonly<{
  productId: string;
  quantity: string;
  standardUnitPriceMinor: bigint;
  loyaltyUnitPriceMinor?: bigint | null;
  promotionBasisPoints?: number;
  promotionUnitPriceMinor?: bigint | null;
}>;

export type PricingContext = Readonly<{
  loyaltyEligible: boolean;
  paymentMethod?: "CASH" | "BANK_TRANSFER" | "CARD";
  deliveryMinor?: bigint;
  surchargeMinor?: bigint;
}>;

export type PricingResult = Readonly<{
  subtotalMinor: bigint;
  discountMinor: bigint;
  deliveryMinor: bigint;
  surchargeMinor: bigint;
  totalMinor: bigint;
  lines: ReadonlyArray<{
    productId: string;
    unitPriceMinor: bigint;
    quantity: string;
    lineSubtotalMinor: bigint;
    lineDiscountMinor: bigint;
    lineTotalMinor: bigint;
    priceSource: "STANDARD" | "LOYALTY" | "PROMOTION";
  }>;
}>;

export function calculatePrice(lines: readonly PricingLine[], context: PricingContext): PricingResult {
  const pricedLines = lines.map((line) => {
    const useLoyaltyPrice = context.loyaltyEligible && line.loyaltyUnitPriceMinor != null;
    const baseUnitPriceMinor = useLoyaltyPrice
      ? line.loyaltyUnitPriceMinor!
      : line.standardUnitPriceMinor;
    const hasPromotionPrice = line.promotionUnitPriceMinor != null && line.promotionUnitPriceMinor >= 0n && line.promotionUnitPriceMinor < baseUnitPriceMinor;
    const unitPriceMinor = hasPromotionPrice ? line.promotionUnitPriceMinor! : baseUnitPriceMinor;
    const lineSubtotalMinor = multiplyMinorUnits(baseUnitPriceMinor, line.quantity);
    const promotedTotalMinor = multiplyMinorUnits(unitPriceMinor, line.quantity);
    const lineDiscountMinor = hasPromotionPrice
      ? lineSubtotalMinor - promotedTotalMinor
      : percentageDiscount(lineSubtotalMinor, line.promotionBasisPoints ?? 0);

    return {
      loyaltyPriced: useLoyaltyPrice,
      productId: line.productId,
      unitPriceMinor,
      quantity: line.quantity,
      lineSubtotalMinor,
      lineDiscountMinor,
      lineTotalMinor: lineSubtotalMinor - lineDiscountMinor,
      priceSource: hasPromotionPrice ? ("PROMOTION" as const) : useLoyaltyPrice ? ("LOYALTY" as const) : ("STANDARD" as const),
    };
  });

  const subtotalMinor = pricedLines.reduce((total, line) => total + line.lineSubtotalMinor, 0n);
  const discountMinor = pricedLines.reduce((total, line) => total + line.lineDiscountMinor, 0n);
  const deliveryMinor = context.deliveryMinor ?? 0n;
  const loyaltyTotal = pricedLines.filter((line) => line.loyaltyPriced).reduce((total, line) => total + line.lineTotalMinor, 0n);
  // Round once to the nearest cent on the loyalty-priced subtotal.
  const cardAdjustment = context.paymentMethod === "CARD" ? (loyaltyTotal * 4n + 50n) / 100n : 0n;
  const surchargeMinor = (context.surchargeMinor ?? 0n) + cardAdjustment;

  if (deliveryMinor < 0n || surchargeMinor < 0n) {
    throw new RangeError("Charges cannot be negative");
  }

  return {
    subtotalMinor,
    discountMinor,
    deliveryMinor,
    surchargeMinor,
    totalMinor: subtotalMinor - discountMinor + deliveryMinor + surchargeMinor,
    lines: pricedLines,
  };
}
