import Decimal from "decimal.js";

export type Money = Readonly<{
  amountMinor: bigint;
  currency: "LKR";
}>;

export const LKR = (amountMinor: bigint): Money => ({ amountMinor, currency: "LKR" });

export function multiplyMinorUnits(unitAmountMinor: bigint, quantity: Decimal.Value): bigint {
  const total = new Decimal(unitAmountMinor.toString()).mul(quantity);
  if (total.isNegative()) throw new RangeError("Calculated amount cannot be negative");
  return BigInt(total.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0));
}

export function percentageDiscount(amountMinor: bigint, basisPoints: number): bigint {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new RangeError("Basis points must be an integer between 0 and 10,000");
  }

  return (amountMinor * BigInt(basisPoints)) / 10_000n;
}

export function formatLkr(amountMinor: bigint, locale = "en-LK"): string {
  const safeAmount = Number(amountMinor) / 100;
  if (!Number.isSafeInteger(Number(amountMinor))) {
    throw new RangeError("Amount is too large to format safely");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(safeAmount);
}
