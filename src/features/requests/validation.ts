import Decimal from "decimal.js";
import { z } from "zod";

export class RequestValidationError extends Error {}

export const requestSchema = z.object({
  kind: z.enum(["quote", "preorder"]),
  requestKey: z.uuid(),
  locale: z.enum(["en", "si", "ta"]),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(?:\+94|0)7\d{8}$/),
  vehicle: z.string().trim().max(200),
  notes: z.string().trim().min(5).max(2000),
  productSlug: z.string().max(150),
  variantId: z.string().max(100),
  quantity: z.string().regex(/^\d+(?:\.\d{1,3})?$/).refine((value) => new Decimal(value).gt(0) && new Decimal(value).lte(10000)),
  accepted: z.literal("on"),
});

export function quotationFeeMinor(input: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) throw new RequestValidationError("Enter a non-negative fee with at most two decimals.");
  const value = new Decimal(input).mul(100);
  if (value.gt("10000000000")) throw new RequestValidationError("Fee is too large.");
  return BigInt(value.toFixed(0));
}

export function assertPreorderDecision(status: string) {
  if (status !== "PENDING_APPROVAL") throw new RequestValidationError("This pre-order has already been reviewed. Reload the page.");
}

export function assertQuotationEditable(status: string) {
  if (!["REQUESTED", "UNDER_REVIEW", "PREPARED"].includes(status)) throw new RequestValidationError("This quotation can no longer be changed. Reload the page.");
}
