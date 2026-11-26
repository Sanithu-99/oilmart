import Decimal from "decimal.js";

export function stepQuantity(quantity: string, step: string, direction: 1 | -1) {
  return new Decimal(quantity).plus(new Decimal(step).mul(direction)).toString();
}
export function belowMinimum(quantity: string, minimum: string) { return new Decimal(quantity).lt(minimum); }
export function exceedsAvailable(quantity: string, available: number) { return new Decimal(quantity).gt(available); }
